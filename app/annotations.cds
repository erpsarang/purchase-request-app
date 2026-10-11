using PurchaseRequestService as service from '../src/srv/purchase-request-service';

annotate service.PurchaseRequests with {
  title      @title: '제목';
  requester  @title: '요청자';
  department @title: '부서';
  neededBy   @title: '필요일';
  status     @title: '상태';
  rejectReason @title: '반려 사유';
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
      { Value: status },
      { Value: rejectReason }
    ]
  },
  UI.Identification: [
    {
      $Type: 'UI.DataFieldForAction',
      Action: 'PurchaseRequestService.submit',
      Label: '상신',
      ![@UI.Hidden]: { $edmJson: { $Not: { $Path: 'IsActiveEntity' } } }
    },
    {
      $Type: 'UI.DataFieldForAction',
      Action: 'PurchaseRequestService.approve',
      Label: '승인',
      ![@UI.Hidden]: { $edmJson: { $Not: { $Path: 'IsActiveEntity' } } }
    },
    {
      $Type: 'UI.DataFieldForAction',
      Action: 'PurchaseRequestService.reject',
      Label: '반려',
      ![@UI.Hidden]: { $edmJson: { $Not: { $Path: 'IsActiveEntity' } } }
    }
  ]
);

annotate service.PurchaseRequests actions {
  reject(reason @title: '반려 사유');
};
