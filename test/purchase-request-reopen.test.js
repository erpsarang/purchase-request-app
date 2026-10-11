import cds from '@sap/cds'
import { test, describe } from 'node:test'
import assert from 'node:assert'

describe('PurchaseRequestService (반려 건 재작성)', () => {
  const { GET, POST, PATCH } = cds.test(new URL('..', import.meta.url).pathname)

  const BASE = '/odata/v4/purchase-request/PurchaseRequests'
  const draftKey = id => `${BASE}(ID=${id},IsActiveEntity=false)`
  const activeKey = id => `${BASE}(ID=${id},IsActiveEntity=true)`
  const statusIs = code => err => err.response?.status === code
  const valid = () => ({ title: '노트북 구매', requester: '김철수' })
  const newActive = async () => {
    const id = (await POST(BASE, valid())).data.ID
    await POST(`${draftKey(id)}/PurchaseRequestService.draftActivate`, {})
    return id
  }
  const act = (id, name, body = {}) => POST(`${activeKey(id)}/PurchaseRequestService.${name}`, body)
  const edit = id => POST(`${activeKey(id)}/PurchaseRequestService.draftEdit`, { PreserveChanges: true })
  const read = async id => (await GET(activeKey(id))).data
  const setStatus = (id, status) =>
    cds.db.run(UPDATE('purchase.request.PurchaseRequests').set({ status }).where({ ID: id }))
  const newRejected = async (reason = '예산 초과') => {
    const id = await newActive()
    await act(id, 'submit')
    await act(id, 'reject', { reason })
    return id
  }

  test('1. 반려된 건 재작성은 204, DRAFT, 반려 사유 유지', async () => {
    const id = await newRejected()
    const res = await act(id, 'reopen')
    assert.strictEqual(res.status, 204)
    const got = await read(id)
    assert.strictEqual(got.status, 'DRAFT')
    assert.strictEqual(got.rejectReason, '예산 초과')
  })

  for (const status of ['DRAFT', 'SUBMITTED', 'APPROVED']) {
    test(`2. ${status} 건 재작성은 409이고 상태와 반려 사유 유지`, async () => {
      const id = await newActive()
      if (status === 'SUBMITTED') await act(id, 'submit')
      else if (status !== 'DRAFT') await setStatus(id, status)
      const before = await read(id)
      await assert.rejects(act(id, 'reopen'), statusIs(409))
      const got = await read(id)
      assert.strictEqual(got.status, status)
      assert.strictEqual(got.rejectReason, before.rejectReason)
    })
  }

  test('3. 재작성한 건은 PATCH 200, draftEdit 201', async () => {
    const id = await newRejected()
    await act(id, 'reopen')
    const res = await PATCH(activeKey(id), { title: '모니터 구매' })
    assert.strictEqual(res.status, 200)
    assert.strictEqual((await read(id)).title, '모니터 구매')
    const ed = await edit(id)
    assert.strictEqual(ed.status, 201)
  })

  test('4. 재작성한 건을 다시 상신하면 204, SUBMITTED, 반려 사유 비움', async () => {
    const id = await newRejected()
    await act(id, 'reopen')
    const res = await act(id, 'submit')
    assert.strictEqual(res.status, 204)
    const got = await read(id)
    assert.strictEqual(got.status, 'SUBMITTED')
    assert.ok(!got.rejectReason)
  })

  test('5. 반려된 적 없는 DRAFT 건을 상신해도 반려 사유는 비어 있음', async () => {
    const id = await newActive()
    await act(id, 'submit')
    const got = await read(id)
    assert.strictEqual(got.status, 'SUBMITTED')
    assert.ok(!got.rejectReason)
  })

  test('6. 다시 상신한 건을 새 사유로 반려하면 REJECTED와 새 사유', async () => {
    const id = await newRejected()
    await act(id, 'reopen')
    await act(id, 'submit')
    await act(id, 'reject', { reason: '사양 불일치' })
    const got = await read(id)
    assert.strictEqual(got.status, 'REJECTED')
    assert.strictEqual(got.rejectReason, '사양 불일치')
  })

  test('7. 다시 상신한 건에 PATCH는 409', async () => {
    const id = await newRejected()
    await act(id, 'reopen')
    await act(id, 'submit')
    await assert.rejects(PATCH(activeKey(id), { title: '변경됨' }), statusIs(409))
    assert.strictEqual((await read(id)).title, '노트북 구매')
  })

  test('8. $metadata에 reopen 동작이 있다', async () => {
    const { data } = await GET('/odata/v4/purchase-request/$metadata')
    assert.ok(data.includes('Name="reopen"'))
  })
})
