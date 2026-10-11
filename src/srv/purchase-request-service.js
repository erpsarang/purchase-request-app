import cds from '@sap/cds'

const isBlank = v => typeof v !== 'string' || v.trim() === ''

// 로컬 기준 오늘 날짜 (YYYY-MM-DD)
const today = () => {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default class PurchaseRequestService extends cds.ApplicationService {
  init() {
    this.before('CREATE', 'PurchaseRequests', req => {
      const { title, requester, neededBy } = req.data
      if (isBlank(title)) return req.error(400, 'title은 필수이며 공백만 입력할 수 없습니다', 'title')
      if (isBlank(requester)) return req.error(400, 'requester는 필수이며 공백만 입력할 수 없습니다', 'requester')
      if (neededBy && String(neededBy) < today()) {
        return req.error(400, 'neededBy는 오늘보다 이전일 수 없습니다', 'neededBy')
      }
      req.data.status = 'DRAFT'
    })

    const guardEditable = async req => {
      const row = await cds.db.run(SELECT.one.from('purchase.request.PurchaseRequests').columns('status').where({ ID: req.params[0]?.ID ?? req.params[0] }))
      if (row && row.status !== 'DRAFT') return req.error(409, 'DRAFT 상태의 구매요청만 수정할 수 있습니다')
    }
    this.before('EDIT', 'PurchaseRequests', guardEditable)

    this.before('UPDATE', 'PurchaseRequests', async req => {
      await guardEditable(req)
      if ('title' in req.data && isBlank(req.data.title)) {
        return req.error(400, 'title은 공백만 입력할 수 없습니다', 'title')
      }
      if ('requester' in req.data && isBlank(req.data.requester)) {
        return req.error(400, 'requester는 공백만 입력할 수 없습니다', 'requester')
      }
      delete req.data.status
    })

    this.before('DELETE', 'PurchaseRequests', async req => {
      const row = await this.run(SELECT.one.from(req.subject).columns('status'))
      if (!row) return
      if (row.status !== 'DRAFT') {
        return req.error(409, 'DRAFT 상태의 구매요청만 삭제할 수 있습니다')
      }
    })

    const transition = (action, from, to) => {
      this.on(action, 'PurchaseRequests', async req => {
        const { ID } = req.params[0]
        const row = await cds.db.run(SELECT.one.from('purchase.request.PurchaseRequests').columns('status').where({ ID }))
        if (!row) return req.error(404, '구매요청을 찾을 수 없습니다')
        if (row.status !== from) return req.error(409, `${from} 상태의 구매요청만 처리할 수 있습니다`)
        const data = { status: to }
        if (action === 'reject') {
          if (isBlank(req.data.reason)) return req.error(400, '반려 사유는 필수입니다', 'reason')
          data.rejectReason = req.data.reason.trim()
        }
        await cds.db.run(UPDATE('purchase.request.PurchaseRequests').set(data).where({ ID }))
      })
    }
    transition('submit', 'DRAFT', 'SUBMITTED')
    transition('approve', 'SUBMITTED', 'APPROVED')
    transition('reject', 'SUBMITTED', 'REJECTED')

    return super.init()
  }
}
