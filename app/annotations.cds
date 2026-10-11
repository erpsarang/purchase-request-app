using PurchaseRequestService as service from '../src/srv/purchase-request-service';

annotate service.PurchaseRequests with {
  title      @title: '제목';
  requester  @title: '요청자';
  department @title: '부서';
  neededBy   @title: '필요일';
  status     @title: '상태';
};

annotate service.PurchaseRequests with @(
  UI.HeaderInfo: {
    TypeName: '구매요청',
    TypeNamePlural: '구매요청',
    Title: { Value: title },
    Description: { Value: requester }
  },
  UI.SelectionFields: [ requester, department, status ],
  UI.LineItem: [
    { Value: title },
    { Value: requester },
    { Value: department },
    { Value: neededBy },
    { Value: status }
  ],
  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', Label: '기본 정보', Target: '@UI.FieldGroup#Main' }
  ],
  UI.FieldGroup #Main: {
    Data: [
      { Value: title },
      { Value: requester },
      { Value: department },
      { Value: neededBy },
      { Value: status }
    ]
  }
);
