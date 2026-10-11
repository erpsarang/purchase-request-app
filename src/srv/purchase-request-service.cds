using { purchase.request as db } from '../db/schema';

service PurchaseRequestService {
  @odata.draft.enabled
  entity PurchaseRequests as projection on db.PurchaseRequests actions {
    @Core.OperationAvailable: ($self.status = 'DRAFT')
    @Common.SideEffects: { TargetEntities: ['in'] }
    action submit();
    @Core.OperationAvailable: ($self.status = 'SUBMITTED')
    @Common.SideEffects: { TargetEntities: ['in'] }
    action approve();
    @Core.OperationAvailable: ($self.status = 'SUBMITTED')
    @Common.SideEffects: { TargetEntities: ['in'] }
    action reject(reason : String(200));
  };
}

annotate PurchaseRequestService.PurchaseRequests with {
  status @readonly;
  rejectReason @readonly;
};
