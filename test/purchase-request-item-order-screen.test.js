import cds from '@sap/cds'
import { test, describe, before } from 'node:test'
import assert from 'node:assert'

describe('PurchaseRequestService (품목 표 순서 화면 정의)', () => {
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
  const facetsOf = () => {
    const re = /<Annotation Term="UI\.Facets"[^>]*>([\s\S]*?)(?=<Annotation Term="(?!HTML5)|$)/
    return bodyOf(`${NS}.PurchaseRequests`).match(re)?.[1] ?? ''
  }
  const facetRecords = () => [...facetsOf().matchAll(/<Record Type="UI\.ReferenceFacet">([\s\S]*?)<\/Record>/g)].map(m => m[1])
  const labelOf = record => record.match(/Property="Label" String="([^"]+)"/)?.[1]

  test('1. 품목 구역이 정렬 정의(PresentationVariant)를 가리키고 열 정의(LineItem)를 직접 가리키지 않는다', () => {
    const facet = facetRecords().find(r => labelOf(r) === '품목')
    assert.ok(facet, '품목 구역이 있어야 한다')
    assert.ok(facet.includes('PresentationVariant'))
    assert.ok(!facet.includes('LineItem'))
  })

  test('2. 구역 순서와 이름이 기본 정보, 공급업체, 품목 그대로이다', () => {
    assert.deepStrictEqual(facetRecords().map(labelOf), ['기본 정보', '공급업체', '품목'])
  })

  test('3. 품목 표에 lineNo 오름차순 정렬 정의가 있다', () => {
    const m = bodyOf(`${NS}.PurchaseRequestItems`).match(/Term="UI\.PresentationVariant"[\s\S]*/)?.[0] ?? ''
    assert.ok(m.includes('SortOrder'))
    assert.ok(m.includes('lineNo'))
  })
})
