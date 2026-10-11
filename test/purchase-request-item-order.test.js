import cds from '@sap/cds'
import { test, describe } from 'node:test'
import assert from 'node:assert'

describe('PurchaseRequestService (품목 순서)', () => {
  const { GET, POST, PATCH, DELETE } = cds.test(new URL('..', import.meta.url).pathname)

  const SRV = '/odata/v4/purchase-request'
  const BASE = `${SRV}/PurchaseRequests`
  const draftKey = id => `${BASE}(ID=${id},IsActiveEntity=false)`
  const activeKey = id => `${BASE}(ID=${id},IsActiveEntity=true)`
  const valid = () => ({ title: '노트북 구매', requester: '김철수' })
  const activate = id => POST(`${draftKey(id)}/PurchaseRequestService.draftActivate`, {})
  const edit = id => POST(`${activeKey(id)}/PurchaseRequestService.draftEdit`, { PreserveChanges: true })
  const names = ['가', '나', '다', '라', '마', '바']
  const newActive = async items => {
    const id = (await POST(BASE, { ...valid(), items })).data.ID
    await activate(id)
    return id
  }
  const ordered = async id => (await GET(`${activeKey(id)}/items?$orderby=lineNo`)).data.value

  test('1. 6줄을 등록·활성화하면 번호 순 조회가 입력 순서와 같고 번호가 1~6이다', async () => {
    const id = await newActive(names.map(item => ({ item })))
    const rows = await ordered(id)
    assert.deepStrictEqual(rows.map(r => r.item), names)
    assert.deepStrictEqual(rows.map(r => r.lineNo), [1, 2, 3, 4, 5, 6])
  })

  test('2. 여러 번 조회해도 순서가 같다', async () => {
    const id = await newActive(names.map(item => ({ item })))
    for (let i = 0; i < 3; i++) {
      assert.deepStrictEqual((await ordered(id)).map(r => r.item), names)
    }
  })

  test('3. 편집용 초안에서 행을 더하면 맨 아래 번호가 붙고 활성화 후에도 유지된다', async () => {
    const id = await newActive(names.slice(0, 3).map(item => ({ item })))
    await edit(id)
    await POST(`${draftKey(id)}/items`, { item: '사' })
    await activate(id)
    const rows = await ordered(id)
    assert.deepStrictEqual(rows.map(r => r.item), ['가', '나', '다', '사'])
    assert.deepStrictEqual(rows.map(r => r.lineNo), [1, 2, 3, 4])
  })

  test('4. 중간 행을 지워도 나머지 번호와 순서가 그대로이고 더하면 최대 번호+1이다', async () => {
    const id = await newActive(names.map(item => ({ item })))
    const rows = await ordered(id)
    const third = rows.find(r => r.lineNo === 3)
    await edit(id)
    await DELETE(`${draftKey(id)}/items(ID=${third.ID},IsActiveEntity=false)`)
    await activate(id)
    const after = await ordered(id)
    assert.deepStrictEqual(after.map(r => r.lineNo), [1, 2, 4, 5, 6])
    assert.deepStrictEqual(after.map(r => r.item), ['가', '나', '라', '마', '바'])
    await edit(id)
    await POST(`${draftKey(id)}/items`, { item: '사' })
    await activate(id)
    const last = (await ordered(id)).at(-1)
    assert.strictEqual(last.item, '사')
    assert.strictEqual(last.lineNo, 7)
  })

  test('5. 번호를 직접 보내도 반영되지 않는다', async () => {
    const id = await newActive([{ item: '가', lineNo: 99 }, { item: '나', lineNo: 5 }])
    assert.deepStrictEqual((await ordered(id)).map(r => r.lineNo), [1, 2])
    await edit(id)
    const added = (await POST(`${draftKey(id)}/items`, { item: '다', lineNo: 50 })).data
    assert.strictEqual(added.lineNo, 3)
    const patched = await PATCH(`${draftKey(id)}/items(ID=${added.ID},IsActiveEntity=false)`, { lineNo: 77 })
    assert.strictEqual(patched.status, 200)
    await activate(id)
    assert.deepStrictEqual((await ordered(id)).map(r => r.lineNo), [1, 2, 3])
  })

  test('6. 품목 표가 lineNo 오름차순 정렬로 정의되어 있다', async () => {
    const { data } = await GET(`${SRV}/$metadata`)
    const block = [...data.matchAll(/<Annotations Target="([^"]+)">([\s\S]*?)<\/Annotations>/g)]
      .find(([, target]) => target === 'PurchaseRequestService.PurchaseRequestItems')?.[2] ?? ''
    const m = block.match(/Term="UI\.PresentationVariant"[\s\S]*/)?.[0] ?? ''
    assert.ok(m.includes('SortOrder'))
    assert.ok(m.includes('lineNo'))
  })
})
