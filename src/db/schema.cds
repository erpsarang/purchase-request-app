namespace purchase.request;

using { cuid, managed, Currency } from '@sap/cds/common';

entity PurchaseRequests : cuid, managed {
  title      : String(100) @mandatory;
  requester  : String(60) @mandatory;
  department : String(40);
  neededBy   : Date;
  status     : String(10) enum { DRAFT; SUBMITTED; APPROVED; REJECTED; } default 'DRAFT';
  rejectReason : String(200);
  vendor : String(60);
  items  : Composition of many PurchaseRequestItems on items.request = $self;
}

entity Departments {
  key code : String(40);
  name : String(40);
}

entity PurchaseRequestItems : cuid {
  request  : Association to PurchaseRequests;
  lineNo   : Integer;
  item     : String(100);
  quantity : Decimal(13, 3);
  unit     : Association to Units @assert.target;
  price    : Decimal(15, 2) @Semantics.amount.currencyCode: 'currency_code';
  currency : Currency @assert.target;
  kind     : String(7) @assert.range enum { ASSET; EXPENSE; };
}

@cds.autoexpose
@cds.odata.valuelist
entity Units { key code : String(3); name : String(30); }
