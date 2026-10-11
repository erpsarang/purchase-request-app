import cds from '@sap/cds'
import { test, describe } from 'node:test'
import assert from 'node:assert'

describe('PurchaseRequestService (공급업체·품목)', () => {
  const { GET, POST, PATCH, DELETE } = cds.test(new URL('..', import.meta.url).pathname)

  const SRV = '/odata/v4/purchase-request'
  const BASE = `${SRV}/PurchaseRequests`
  const draftKey = id => `${BASE}(ID=${id},IsActiveEntity=false)`
  const activeKey = id => `${BASE}(ID=${id},IsActiveEntity=true)`
  const statusIs = code => err => err.response?.status === code
  // 직접 경로는 draft 계층이 먼저 422로 거부할 수 있다
  const refused = err => [409, 422].includes(err.response?.status)
  const valid = () => ({ title: '노트북 구매', requester: '김철수' })
  const activate = id => POST(`${draftKey(id)}/PurchaseRequestService.draftActivate`, {})
  const newDraft = async body => (await POST(BASE, body)).data.ID
  const newActive = async body => {
    const id = await newDraft(body)
    const res = await activate(id)
    assert.strictEqual(res.status, 201)
    return id
  }
  const readItems = async id => (await GET(`${activeKey(id)}?$expand=items`)).data.items
  const lines = () => [
    { item: '노트북', quantity: 2, unit_code: 'EA', price: 1500000.5, currency_code: 'KRW', kind: 'ASSET' },
    { item: '용지', quantity: 1.5, unit_code: 'BOX', price: 20, currency_code: 'USD', kind: 'EXPENSE' }
  ]

  test('1. 공급업체와 품목 여러 줄을 담아 등록·활성화하면 값이 그대로다', async () => {
    const id = await newActive({ ...valid(), vendor: '삼성전자', items: lines() })
    const got = (await GET(`${activeKey(id)}?$expand=items`)).data
    assert.strictEqual(got.vendor, '삼성전자')
    assert.strictEqual(got.items.length, 2)
    const a = got.items.find(i => i.item === '노트북')
    assert.strictEqual(Number(a.quantity), 2)
    assert.strictEqual(a.unit_code, 'EA')
    assert.strictEqual(Number(a.price), 1500000.5)
    assert.strictEqual(a.currency_code, 'KRW')
    assert.strictEqual(a.kind, 'ASSET')
    const b = got.items.find(i => i.item === '용지')
    assert.strictEqual(Number(b.quantity), 1.5)
    assert.strictEqual(b.kind, 'EXPENSE')
  })

  test('2. 수량 0 이하, 음수 가격은 활성화가 400', async () => {
    for (const bad of [{ quantity: 0 }, { quantity: -1 }, { price: -1 }]) {
      const id = await newDraft({ ...valid(), items: [{ item: '노트북', ...bad }] })
      await assert.rejects(activate(id), statusIs(400))
    }
  })

  test('3. 목록에 없는 단위·통화키, 범위 밖 자산/비용은 활성화가 400', async () => {
    for (const bad of [{ unit_code: 'XXX' }, { currency_code: 'XXX' }, { kind: 'OTHER' }]) {
      const id = await newDraft({ ...valid(), items: [{ item: '노트북', ...bad }] })
      await assert.rejects(activate(id), statusIs(400))
    }
  })

  test('4. 값이 비어도, 품목이 없어도 활성화된다', async () => {
    await newActive({ ...valid(), items: [{}] })
    await newActive(valid())
  })

  test('5. 단위·통화 목록 조회 시 목록이 모두 나온다', async () => {
    const units = (await GET(`${SRV}/Units`)).data.value
    assert.deepStrictEqual(units.map(u => u.code).sort(), ['BOX', 'EA', 'KG'])
    const currencies = (await GET(`${SRV}/Currencies`)).data.value
    assert.deepStrictEqual(currencies.map(c => c.code).sort(), ['EUR', 'KRW', 'USD'])
  })

  test('6. DRAFT 요청은 편집용 초안에서 품목을 고치고 더해 활성화된다', async () => {
    const id = await newActive({ ...valid(), items: [lines()[0]] })
    const [first] = await readItems(id)
    await POST(`${activeKey(id)}/PurchaseRequestService.draftEdit`, { PreserveChanges: true })
    const patched = await PATCH(`${draftKey(id)}/items(ID=${first.ID},IsActiveEntity=false)`, { item: '고성능 노트북' })
    assert.strictEqual(patched.status, 200)
    await POST(`${draftKey(id)}/items`, lines()[1])
    await activate(id)
    const items = await readItems(id)
    assert.strictEqual(items.length, 2)
    assert.ok(items.some(i => i.item === '고성능 노트북'))
    assert.ok(items.some(i => i.item === '용지'))
  })

  test('7. 상신된 요청의 품목 수정·삭제는 거부되고 값이 그대로다', async () => {
    const id = await newActive({ ...valid(), items: [lines()[0]] })
    const [first] = await readItems(id)
    await POST(`${activeKey(id)}/PurchaseRequestService.submit`, {})
    const nested = `${activeKey(id)}/items(ID=${first.ID},IsActiveEntity=true)`
    const direct = `${SRV}/PurchaseRequestItems(ID=${first.ID},IsActiveEntity=true)`
    await assert.rejects(PATCH(nested, { item: '변경' }), statusIs(409))
    await assert.rejects(PATCH(direct, { item: '변경' }), refused)
    await assert.rejects(DELETE(nested), statusIs(409))
    await assert.rejects(DELETE(direct), refused)
    const items = await readItems(id)
    assert.strictEqual(items.length, 1)
    assert.strictEqual(items[0].item, '노트북')
  })

  test('8. 값 도움말이 세 곳에만 붙는다', async () => {
    const { data } = await GET(`${SRV}/$metadata`)
    const blocks = [...data.matchAll(/<Annotations Target="([^"]+)">([\s\S]*?)<\/Annotations>/g)]
    const targets = blocks.filter(([, , body]) => body.includes('Term="Common.ValueList"')).map(([, target]) => target).sort()
    assert.deepStrictEqual(targets, [
      'PurchaseRequestService.PurchaseRequestItems/currency_code',
      'PurchaseRequestService.PurchaseRequestItems/unit_code',
      'PurchaseRequestService.PurchaseRequests/department'
    ])
  })
})
