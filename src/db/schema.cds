namespace purchase.request;

using { cuid, managed } from '@sap/cds/common';

entity PurchaseRequests : cuid, managed {
  title      : String(100) @mandatory;
  requester  : String(60) @mandatory;
  department : String(40);
  neededBy   : Date;
  status     : String(10) enum { DRAFT; SUBMITTED; APPROVED; REJECTED; } default 'DRAFT';
  rejectReason : String(200);
}
