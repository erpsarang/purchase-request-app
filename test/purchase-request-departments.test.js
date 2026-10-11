import cds from '@sap/cds'
import { test, describe } from 'node:test'
import assert from 'node:assert'

describe('Departments (value help)', () => {
  const { GET, POST, PATCH, DELETE } = cds.test(new URL('..', import.meta.url).pathname)

  const SRV = '/odata/v4/purchase-request'
  const BASE = `${SRV}/PurchaseRequests`
  const DEPTS = `${SRV}/Departments`
  const draftKey = id => `${BASE}(ID=${id},IsActiveEntity=false)`
  const activeKey = id => `${BASE}(ID=${id},IsActiveEntity=true)`
  const rejectedReadOnly = err => [403, 405].includes(err.response?.status)
  const activate = id => POST(`${draftKey(id)}/PurchaseRequestService.draftActivate`, {})
  const newActive = async body => {
    const id = (await POST(BASE, body)).data.ID
    const res = await activate(id)
    assert.strictEqual(res.status, 201)
    return id
  }

  const expected = [
    ['D01', '컨설팅본부-EN'],
    ['D02', '컨설팅본부-GB'],
    ['D03', 'TEC본부-DE사업부'],
    ['D04', 'TEC본부-WA사업부'],
    ['D05', 'TEC본부-통합개발센터'],
    ['D06', 'TEC본부-TA사업부'],
    ['D07', 'ITO본부-FCM사업부'],
    ['D08', 'ITO본부-SCM사업부'],
    ['D09', '신사업본부'],
    ['D10', 'AI본부-AT사업부'],
    ['D11', 'DT본부'],
    ['D12', '경영관리본부'],
    ['D13', '영업본부']
  ]

  test('1. 부서 목록 조회 시 13건의 코드와 이름이 맞다', async () => {
    const res = await GET(DEPTS)
    assert.strictEqual(res.status, 200)
    assert.strictEqual(res.data.value.length, 13)
    for (const [code, name] of expected) {
      const row = res.data.value.find(r => r.code === code)
      assert.ok(row, `${code} 없음`)
      assert.strictEqual(row.name, name)
    }
  })

  test('2. 부서 목록 등록·수정·삭제는 거부되고 목록은 그대로다', async () => {
    await assert.rejects(POST(DEPTS, { code: 'D99', name: '새부서' }), rejectedReadOnly)
    await assert.rejects(PATCH(`${DEPTS}('D01')`, { name: '변경' }), rejectedReadOnly)
    await assert.rejects(DELETE(`${DEPTS}('D01')`), rejectedReadOnly)
    const res = await GET(DEPTS)
    assert.strictEqual(res.data.value.length, 13)
    assert.strictEqual(res.data.value.find(r => r.code === 'D01').name, '컨설팅본부-EN')
  })

  test('3. $metadata에서 department 칸에만 값 도움말이 붙고 Departments의 name을 가리킨다', async () => {
    const { data } = await GET(`${SRV}/$metadata`)
    const blocks = [...data.matchAll(/<Annotations Target="([^"]+)">([\s\S]*?)<\/Annotations>/g)]
    const withValueList = blocks.filter(([, , body]) => body.includes('Term="Common.ValueList"'))
    assert.deepStrictEqual(withValueList.map(([, target]) => target).sort(), [
      'PurchaseRequestService.PurchaseRequestItems/currency_code',
      'PurchaseRequestService.PurchaseRequestItems/unit_code',
      'PurchaseRequestService.PurchaseRequests/department'
    ])
    const body = withValueList.find(([, target]) => target === 'PurchaseRequestService.PurchaseRequests/department')[2]
    assert.ok(body.includes('Property="CollectionPath" String="Departments"'))
    assert.ok(body.includes('Common.ValueListParameterInOut'))
    assert.ok(body.includes('Property="LocalDataProperty" PropertyPath="department"'))
    assert.ok(body.includes('Property="ValueListProperty" String="name"'))
  })

  test('4. 목록의 이름으로 부서를 채워 등록·활성화하면 그대로 저장된다', async () => {
    const id = await newActive({ title: '노트북 구매', requester: '김철수', department: 'TEC본부-DE사업부' })
    assert.strictEqual((await GET(activeKey(id))).data.department, 'TEC본부-DE사업부')
  })

  test('5. 목록에 없는 부서 이름으로도 등록·활성화가 된다', async () => {
    const id = await newActive({ title: '노트북 구매', requester: '김철수', department: '구매 팀' })
    assert.strictEqual((await GET(activeKey(id))).data.department, '구매 팀')
  })

  test('6. 부서를 비워도 등록·활성화가 된다', async () => {
    const id = await newActive({ title: '노트북 구매', requester: '김철수' })
    assert.strictEqual((await GET(activeKey(id))).status, 200)
  })
})
