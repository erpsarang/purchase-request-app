import cds from '@sap/cds'
import { test, describe } from 'node:test'
import assert from 'node:assert'

describe('PurchaseRequestService (편집 후 저장 시 필요일 검사)', () => {
  const { GET, POST, PATCH } = cds.test(new URL('..', import.meta.url).pathname)

  const BASE = '/odata/v4/purchase-request/PurchaseRequests'
  const draftKey = id => `${BASE}(ID=${id},IsActiveEntity=false)`
  const activeKey = id => `${BASE}(ID=${id},IsActiveEntity=true)`
  const statusIs = code => err => err.response?.status === code
  const pad = n => String(n).padStart(2, '0')
  const dateOffset = days => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }
  const activate = id => POST(`${draftKey(id)}/PurchaseRequestService.draftActivate`, {})
  const edit = id => POST(`${activeKey(id)}/PurchaseRequestService.draftEdit`, { PreserveChanges: true })
  const read = async id => (await GET(activeKey(id))).data
  const newActive = async neededBy => {
    const body = { title: '노트북 구매', requester: '김철수' }
    if (neededBy) body.neededBy = neededBy
    const id = (await POST(BASE, body)).data.ID
    await activate(id)
    return id
  }

  test('필요일을 어제로 바꿔 저장하면 400이고 활성 값 유지', async () => {
    const tomorrow = dateOffset(1)
    const id = await newActive(tomorrow)
    await edit(id)
    await PATCH(draftKey(id), { neededBy: dateOffset(-1) })
    await assert.rejects(activate(id), statusIs(400))
    assert.strictEqual((await read(id)).neededBy, tomorrow)
  })

  test('필요일을 모레로 바꿔 저장하면 성공', async () => {
    const id = await newActive(dateOffset(1))
    await edit(id)
    await PATCH(draftKey(id), { neededBy: dateOffset(2) })
    await activate(id)
    assert.strictEqual((await read(id)).neededBy, dateOffset(2))
  })

  test('필요일을 바꾸지 않으면 과거 값이어도 저장 성공', async () => {
    const id = await newActive(dateOffset(1))
    const past = dateOffset(-3)
    await cds.db.run(UPDATE('purchase.request.PurchaseRequests').set({ neededBy: past }).where({ ID: id }))
    await edit(id)
    await PATCH(draftKey(id), { title: '모니터 구매' })
    await activate(id)
    const got = await read(id)
    assert.strictEqual(got.title, '모니터 구매')
    assert.strictEqual(got.neededBy, past)
  })

  test('필요일을 비우면 저장 성공', async () => {
    const id = await newActive(dateOffset(1))
    await edit(id)
    await PATCH(draftKey(id), { neededBy: null })
    await activate(id)
    assert.strictEqual((await read(id)).neededBy, null)
  })
})
