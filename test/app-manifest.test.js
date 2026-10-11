import { test, describe } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

describe('Fiori Elements 화면 앱 정적 검사', () => {
  const manifest = JSON.parse(read('app/purchaserequests/webapp/manifest.json'))

  test('manifest: 앱 id와 데이터 소스 주소', () => {
    assert.strictEqual(manifest['sap.app'].id, 'purchaserequests')
    assert.strictEqual(manifest['sap.app'].dataSources.mainService.uri, '/odata/v4/purchase-request/')
  })

  test('manifest: 모든 라우트 target이 targets에 있다', () => {
    const { routes, targets } = manifest['sap.ui5'].routing
    assert.ok(routes.length > 0)
    for (const route of routes) {
      const names = [].concat(route.target)
      for (const name of names) assert.ok(targets[name], `target 없음: ${name}`)
    }
  })

  test('manifest: 목록은 ListReport, 상세는 ObjectPage, contextPath는 /PurchaseRequests', () => {
    const { targets } = manifest['sap.ui5'].routing
    assert.strictEqual(targets.PurchaseRequestsList.name, 'sap.fe.templates.ListReport')
    assert.strictEqual(targets.PurchaseRequestsObjectPage.name, 'sap.fe.templates.ObjectPage')
    for (const t of Object.values(targets)) {
      assert.strictEqual(t.options.settings.contextPath, '/PurchaseRequests')
    }
  })

  test('index.html: UI5 코어 부트스트랩이 있고 외부 주소가 없다', () => {
    const html = read('app/purchaserequests/webapp/index.html')
    assert.ok(html.includes('sap-ui-core.js'))
    assert.ok(html.includes('id="sap-ui-bootstrap"'))
    assert.ok(!/https?:\/\//.test(html))
  })

  test('ui5.yaml: UI5 1.153.0과 sap.fe.templates', () => {
    const yaml = read('ui5.yaml')
    assert.ok(yaml.includes('1.153.0'))
    assert.ok(yaml.includes('sap.fe.templates'))
  })
})
