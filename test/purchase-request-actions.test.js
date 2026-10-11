import cds from '@sap/cds'
import { test, describe } from 'node:test'
import assert from 'node:assert'

describe('PurchaseRequestService (상신·승인·반려)', () => {
  const { GET, POST } = cds.test(new URL('..', import.meta.url).pathname)

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
  const read = async id => (await GET(activeKey(id))).data
  const setStatus = (id, status) =>
    cds.db.run(UPDATE('purchase.request.PurchaseRequests').set({ status }).where({ ID: id }))

  test('1. 상신하면 204이고 SUBMITTED', async () => {
    const id = await newActive()
    const res = await act(id, 'submit')
    assert.strictEqual(res.status, 204)
    assert.strictEqual((await read(id)).status, 'SUBMITTED')
  })

  test('2. 승인하면 APPROVED', async () => {
    const id = await newActive()
    await act(id, 'submit')
    await act(id, 'approve')
    assert.strictEqual((await read(id)).status, 'APPROVED')
  })

  test('3. 반려 사유가 없거나 공백이면 400이고 상태 유지', async () => {
    const id = await newActive()
    await act(id, 'submit')
    await assert.rejects(act(id, 'reject', {}), statusIs(400))
    await assert.rejects(act(id, 'reject', { reason: '   ' }), statusIs(400))
    assert.strictEqual((await read(id)).status, 'SUBMITTED')
  })

  test('4. 반려 사유가 있으면 REJECTED와 rejectReason 저장', async () => {
    const id = await newActive()
    await act(id, 'submit')
    await act(id, 'reject', { reason: '  예산 초과  ' })
    const got = await read(id)
    assert.strictEqual(got.status, 'REJECTED')
    assert.strictEqual(got.rejectReason, '예산 초과')
  })

  test('5. DRAFT에서 승인은 409이고 상태 유지', async () => {
    const id = await newActive()
    await assert.rejects(act(id, 'approve'), statusIs(409))
    assert.strictEqual((await read(id)).status, 'DRAFT')
  })

  test('6. SUBMITTED에서 상신은 409이고 상태 유지', async () => {
    const id = await newActive()
    await act(id, 'submit')
    await assert.rejects(act(id, 'submit'), statusIs(409))
    assert.strictEqual((await read(id)).status, 'SUBMITTED')
  })

  test('7. APPROVED에서 반려는 409이고 상태 유지', async () => {
    const id = await newActive()
    await setStatus(id, 'APPROVED')
    await assert.rejects(act(id, 'reject', { reason: '사유' }), statusIs(409))
    assert.strictEqual((await read(id)).status, 'APPROVED')
  })

  test('8. $metadata에 submit, approve, reject 동작이 있다', async () => {
    const { data } = await GET('/odata/v4/purchase-request/$metadata')
    assert.ok(data.includes('Name="submit"'))
    assert.ok(data.includes('Name="approve"'))
    assert.ok(data.includes('Name="reject"'))
  })
})
