import cds from '@sap/cds'
import { test, describe, before } from 'node:test'
import assert from 'node:assert'

describe('PurchaseRequestService (화면 구성)', () => {
  const { GET } = cds.test(new URL('..', import.meta.url).pathname)

  const SRV = '/odata/v4/purchase-request'
  const NS = 'PurchaseRequestService'
  let blocks

  before(async () => {
    const { data } = await GET(`${SRV}/$metadata`)
    blocks = [...data.matchAll(/<Annotations Target="([^"]+)">([\s\S]*?)<\/Annotations>/g)]
      .map(([, target, body]) => ({ target, body }))
  })

  const bodyOf = target => blocks.find(b => b.target === target)?.body ?? ''
  // 최상위 어노테이션 하나의 본문 (중첩된 HTML5 어노테이션은 포함)
  const termOf = (target, term) => {
    const re = new RegExp(`<Annotation Term="${term.replace('.', '\\.')}"[^>]*>([\\s\\S]*?)(?=<Annotation Term="(?!HTML5)|$)`)
    return bodyOf(target).match(re)?.[1] ?? ''
  }
  const paths = seg => [...seg.matchAll(/<PropertyValue Property="Value" Path="([^"]+)"/g)].map(m => m[1])
  const labelOf = (entity, field) =>
    bodyOf(`${NS}.${entity}/${field}`).match(/Term="Common\.Label" String="([^"]*)"/)?.[1]

  const REQ = `${NS}.PurchaseRequests`
  const ITEMS = `${NS}.PurchaseRequestItems`

  test('1. 목록 열 순서가 제목, 요청자, 부서, 공급업체, 필요일, 상태', () => {
    assert.deepStrictEqual(paths(termOf(REQ, 'UI.LineItem')),
      ['title', 'requester', 'department', 'vendor', 'neededBy', 'status'])
  })

  test('2. 목록 열 너비가 14, 8, 13, 10, 8, 7rem', () => {
    const widths = [...termOf(REQ, 'UI.LineItem').matchAll(/Property="width" String="([^"]+)"/g)].map(m => m[1])
    assert.deepStrictEqual(widths, ['14rem', '8rem', '13rem', '10rem', '8rem', '7rem'])
  })

  test('3. 검색 조건이 요청자, 부서, 공급업체, 상태', () => {
    const seg = termOf(REQ, 'UI.SelectionFields')
    const names = [...seg.matchAll(/<PropertyPath>([^<]+)<\/PropertyPath>/g)].map(m => m[1])
    assert.deepStrictEqual(names, ['requester', 'department', 'vendor', 'status'])
  })

  test('4. 상세 구역이 기본 정보, 공급업체, 품목', () => {
    const seg = termOf(REQ, 'UI.Facets')
    const labels = [...seg.matchAll(/Property="Label" String="([^"]+)"/g)].map(m => m[1])
    assert.deepStrictEqual(labels, ['기본 정보', '공급업체', '품목'])
    const vendor = paths(termOf(REQ, 'UI.FieldGroup') ? bodyOf(REQ).match(/Term="UI\.FieldGroup" Qualifier="Vendor"[^>]*>([\s\S]*?)(?=<Annotation Term="(?!HTML5)|$)/)?.[1] ?? '' : '')
    assert.deepStrictEqual(vendor, ['vendor'])
  })

  test('5. 품목 표 열 순서가 품목, 수량, 단위, 가격, 통화키, 자산/비용', () => {
    assert.deepStrictEqual(paths(termOf(ITEMS, 'UI.LineItem')),
      ['item', 'quantity', 'unit_code', 'price', 'currency_code', 'kind'])
  })

  test('6. 새 필드 표시 이름이 정해진 값이다', () => {
    assert.strictEqual(labelOf('PurchaseRequests', 'vendor'), '공급업체')
    assert.strictEqual(labelOf('PurchaseRequestItems', 'item'), '품목')
    assert.strictEqual(labelOf('PurchaseRequestItems', 'quantity'), '수량')
    assert.strictEqual(labelOf('PurchaseRequestItems', 'unit_code'), '단위')
    assert.strictEqual(labelOf('PurchaseRequestItems', 'price'), '가격')
    assert.strictEqual(labelOf('PurchaseRequestItems', 'currency_code'), '통화키')
    assert.strictEqual(labelOf('PurchaseRequestItems', 'kind'), '자산/비용')
    const header = termOf(ITEMS, 'UI.HeaderInfo')
    assert.ok(header.includes('Property="TypeName" String="품목"'))
    assert.ok(header.includes('Property="TypeNamePlural" String="품목"'))
  })
})
