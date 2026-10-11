using PurchaseRequestService as service from '../src/srv/purchase-request-service';

annotate service.PurchaseRequests with {
  title      @title: '제목';
  requester  @title: '요청자';
  department @title: '부서';
  vendor     @title: '공급업체';
  neededBy   @title: '필요일';
  status     @title: '상태';
  rejectReason @title: '반려 사유';
};

annotate service.PurchaseRequests with @(
  UI.UpdateHidden: (status != 'DRAFT'),
  UI.HeaderInfo: {
    TypeName: '구매요청',
    TypeNamePlural: '구매요청',
    Title: { Value: title },
    Description: { Value: requester }
  },
  UI.SelectionFields: [ requester, department, vendor, status ],
  UI.LineItem: [
    { Value: title, ![@HTML5.CssDefaults]: { width: '14rem' } },
    { Value: requester, ![@HTML5.CssDefaults]: { width: '8rem' } },
    { Value: department, ![@HTML5.CssDefaults]: { width: '13rem' } },
    { Value: vendor, ![@HTML5.CssDefaults]: { width: '10rem' } },
    { Value: neededBy, ![@HTML5.CssDefaults]: { width: '8rem' } },
    { Value: status, ![@HTML5.CssDefaults]: { width: '7rem' } }
  ],
  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', Label: '기본 정보', Target: '@UI.FieldGroup#Main' },
    { $Type: 'UI.ReferenceFacet', Label: '공급업체', Target: '@UI.FieldGroup#Vendor' },
    { $Type: 'UI.ReferenceFacet', Label: '품목', Target: 'items/@UI.LineItem' }
  ],
  UI.FieldGroup #Vendor: {
    Data: [
      { Value: vendor }
    ]
  },
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
    },
    {
      $Type: 'UI.DataFieldForAction',
      Action: 'PurchaseRequestService.reopen',
      Label: '재작성',
      ![@UI.Hidden]: { $edmJson: { $Not: { $Path: 'IsActiveEntity' } } }
    }
  ]
);

annotate service.PurchaseRequests actions {
  reject(reason @title: '반려 사유');
};

annotate service.PurchaseRequests with {
  department @Common.ValueList: {
    CollectionPath: 'Departments',
    Parameters: [
      { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: department, ValueListProperty: 'name' }
    ]
  };
};

annotate service.PurchaseRequestItems with {
  item          @title: '품목';
  quantity      @title: '수량';
  unit          @title: '단위';
  unit_code     @title: '단위';
  price         @title: '가격';
  currency      @title: '통화키';
  currency_code @title: '통화키';
  kind          @title: '자산/비용';
};

annotate service.PurchaseRequestItems with @(
  UI.HeaderInfo: {
    TypeName: '품목',
    TypeNamePlural: '품목'
  },
  UI.PresentationVariant: {
    SortOrder: [ { Property: lineNo, Descending: false } ],
    Visualizations: [ '@UI.LineItem' ]
  },
  UI.LineItem: [
    { Value: item },
    { Value: quantity },
    { Value: unit_code },
    { Value: price },
    { Value: currency_code },
    { Value: kind }
  ]
);
