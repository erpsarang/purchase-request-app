using { purchase.request as db } from '../db/schema';

service PurchaseRequestService {
  entity PurchaseRequests as projection on db.PurchaseRequests;
}

annotate PurchaseRequestService.PurchaseRequests with {
  status @readonly;
};
