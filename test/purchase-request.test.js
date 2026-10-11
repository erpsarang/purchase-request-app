import cds from '@sap/cds'
import { test, describe } from 'node:test'
import assert from 'node:assert'

describe('PurchaseRequestService (draft)', () => {
  const { GET, POST, PATCH, DELETE } = cds.test(new URL('..', import.meta.url).pathname)

  const BASE = '/odata/v4/purchase-request/PurchaseRequests'
  const draftKey = id => `${BASE}(ID=${id},IsActiveEntity=false)`
  const activeKey = id => `${BASE}(ID=${id},IsActiveEntity=true)`
  const statusIs = code => err => err.response?.status === code
  const valid = () => ({ title: '노트북 구매', requester: '김철수' })
  const pad = n => String(n).padStart(2, '0')
  const dateOffset = days => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }
  const newDraft = async (body = valid()) => (await POST(BASE, body)).data.ID
  const activate = id => POST(`${draftKey(id)}/PurchaseRequestService.draftActivate`, {})
  const newActive = async body => {
    const id = await newDraft(body)
    await activate(id)
    return id
  }

  test('1. 초안을 만들고 활성화하면 활성 레코드가 생기고 status는 DRAFT', async () => {
    const created = await POST(BASE, valid())
    assert.strictEqual(created.status, 201)
    assert.strictEqual(created.data.IsActiveEntity, false)
    const res = await activate(created.data.ID)
    assert.strictEqual(res.status, 201)
    const got = await GET(activeKey(created.data.ID))
    assert.strictEqual(got.data.status, 'DRAFT')
  })

  test('2. requester가 없으면 활성화가 400', async () => {
    const id = await newDraft({ title: '노트북 구매' })
    await assert.rejects(activate(id), statusIs(400))
  })

  test('3. title이 공백뿐이면 활성화가 400', async () => {
    const id = await newDraft({ title: '   ', requester: '김철수' })
    await assert.rejects(activate(id), statusIs(400))
  })

  test('4. neededBy가 어제이면 활성화가 400', async () => {
    const id = await newDraft({ ...valid(), neededBy: dateOffset(-1) })
    await assert.rejects(activate(id), statusIs(400))
  })

  test('5. 편집 초안에서 title을 바꾸고 활성화하면 바뀐 값', async () => {
    const id = await newActive()
    await POST(`${activeKey(id)}/PurchaseRequestService.draftEdit`, { PreserveChanges: true })
    const patched = await PATCH(draftKey(id), { title: '모니터 구매' })
    assert.strictEqual(patched.status, 200)
    await activate(id)
    assert.strictEqual((await GET(activeKey(id))).data.title, '모니터 구매')
  })

  test('6. 초안에서 status를 APPROVED로 바꿔도 활성화 후 DRAFT', async () => {
    const id = await newDraft()
    await PATCH(draftKey(id), { status: 'APPROVED' })
    await activate(id)
    assert.strictEqual((await GET(activeKey(id))).data.status, 'DRAFT')
  })

  test('7. 활성 레코드 DELETE는 204, 다시 GET하면 404', async () => {
    const id = await newActive()
    assert.strictEqual((await DELETE(activeKey(id))).status, 204)
    await assert.rejects(GET(activeKey(id)), statusIs(404))
  })

  test('8. DRAFT가 아닌 활성 건은 DELETE가 409', async () => {
    const id = await newActive()
    await cds.db.run(
      UPDATE('purchase.request.PurchaseRequests').set({ status: 'SUBMITTED' }).where({ ID: id })
    )
    await assert.rejects(DELETE(activeKey(id)), statusIs(409))
    assert.strictEqual((await GET(activeKey(id))).data.status, 'SUBMITTED')
  })

  test('9. 목록 GET은 200이고 활성 레코드를 포함한다', async () => {
    const id = await newActive()
    const list = await GET(`${BASE}?$filter=IsActiveEntity eq true`)
    assert.strictEqual(list.status, 200)
    assert.ok(list.data.value.some(r => r.ID === id))
  })

  test('10. $metadata에 초안(DraftRoot)과 UI 어노테이션(LineItem)이 있다', async () => {
    const { data } = await GET('/odata/v4/purchase-request/$metadata')
    assert.ok(data.includes('DraftRoot'))
    assert.ok(data.includes('UI.LineItem'))
  })
})
