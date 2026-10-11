import cds from '@sap/cds'
import { test, describe } from 'node:test'
import assert from 'node:assert'

describe('PurchaseRequestService', () => {
  const { GET, POST, PATCH, DELETE } = cds.test(new URL('..', import.meta.url).pathname)

  const URL_PATH = '/odata/v4/purchase-request/PurchaseRequests'
  const valid = () => ({ title: '노트북 구매', requester: '김철수' })
  const pad = n => String(n).padStart(2, '0')
  const dateOffset = days => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }
  const statusIs = code => err => err.response?.status === code

  test('1. 등록하면 201, status는 DRAFT, ID가 있다', async () => {
    const res = await POST(URL_PATH, valid())
    assert.strictEqual(res.status, 201)
    assert.strictEqual(res.data.status, 'DRAFT')
    assert.ok(res.data.ID)
  })

  test('2. requester가 없으면 400', async () => {
    await assert.rejects(POST(URL_PATH, { title: '노트북 구매' }), statusIs(400))
  })

  test('3. title이 공백뿐이면 400', async () => {
    await assert.rejects(POST(URL_PATH, { title: '   ', requester: '김철수' }), statusIs(400))
  })

  test('4. neededBy가 어제이면 400', async () => {
    await assert.rejects(POST(URL_PATH, { ...valid(), neededBy: dateOffset(-1) }), statusIs(400))
  })

  test('5. PATCH로 title을 바꾸면 200, 다시 GET하면 바뀐 값', async () => {
    const { data } = await POST(URL_PATH, valid())
    const res = await PATCH(`${URL_PATH}(${data.ID})`, { title: '모니터 구매' })
    assert.strictEqual(res.status, 200)
    const got = await GET(`${URL_PATH}(${data.ID})`)
    assert.strictEqual(got.data.title, '모니터 구매')
  })

  test('6. status를 APPROVED로 PATCH해도 DRAFT로 남는다', async () => {
    const { data } = await POST(URL_PATH, valid())
    await PATCH(`${URL_PATH}(${data.ID})`, { status: 'APPROVED' })
    const got = await GET(`${URL_PATH}(${data.ID})`)
    assert.strictEqual(got.data.status, 'DRAFT')
  })

  test('7. DELETE하면 204, 다시 GET하면 404', async () => {
    const { data } = await POST(URL_PATH, valid())
    const res = await DELETE(`${URL_PATH}(${data.ID})`)
    assert.strictEqual(res.status, 204)
    await assert.rejects(GET(`${URL_PATH}(${data.ID})`), statusIs(404))
  })

  test('8. DRAFT가 아닌 건은 DELETE가 409로 거부된다', async () => {
    const { data } = await POST(URL_PATH, valid())
    await cds.db.run(
      UPDATE('purchase.request.PurchaseRequests').set({ status: 'SUBMITTED' }).where({ ID: data.ID })
    )
    await assert.rejects(DELETE(`${URL_PATH}(${data.ID})`), statusIs(409))
    const got = await GET(`${URL_PATH}(${data.ID})`)
    assert.strictEqual(got.data.status, 'SUBMITTED')
  })
})
