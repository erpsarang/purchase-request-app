import cds from '@sap/cds'
import { test, describe } from 'node:test'
import assert from 'node:assert'

describe('PurchaseRequestService (상신 후 수정 제한)', () => {
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
  const prepare = async status => {
    const id = await newActive()
    if (status === 'SUBMITTED') await act(id, 'submit')
    else await setStatus(id, status)
    return id
  }
  const locked = ['SUBMITTED', 'APPROVED', 'REJECTED']

  for (const status of locked) {
    test(`${status} 건 PATCH는 409이고 제목 유지`, async () => {
      const id = await prepare(status)
      await assert.rejects(PATCH(activeKey(id), { title: '변경됨' }), statusIs(409))
      const got = await read(id)
      assert.strictEqual(got.title, '노트북 구매')
      assert.strictEqual(got.status, status)
    })

    test(`${status} 건 draftEdit는 409`, async () => {
      const id = await prepare(status)
      await assert.rejects(edit(id), statusIs(409))
      assert.strictEqual((await read(id)).status, status)
    })
  }

  test('DRAFT 건은 PATCH 200', async () => {
    const id = await newActive()
    const res = await PATCH(activeKey(id), { title: '모니터 구매' })
    assert.strictEqual(res.status, 200)
    assert.strictEqual((await read(id)).title, '모니터 구매')
  })

  test('DRAFT 건은 draftEdit 201', async () => {
    const id = await newActive()
    const res = await edit(id)
    assert.strictEqual(res.status, 201)
  })

  test('초안 편집 중 활성 건이 상신되면 초안 활성화는 409이고 제목 유지', async () => {
    const id = await newActive()
    await edit(id)
    await PATCH(draftKey(id), { title: '변경됨' })
    await act(id, 'submit')
    await assert.rejects(
      POST(`${draftKey(id)}/PurchaseRequestService.draftActivate`, {}),
      statusIs(409)
    )
    const got = await read(id)
    assert.strictEqual(got.title, '노트북 구매')
    assert.strictEqual(got.status, 'SUBMITTED')
  })

  test('$metadata에 UI.UpdateHidden이 있다', async () => {
    const { data } = await GET('/odata/v4/purchase-request/$metadata')
    assert.ok(data.includes('UI.UpdateHidden'))
  })
})
