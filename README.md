# purchase-request-app
구매요청 간이 관리

구매요청을 등록·조회·수정·삭제하는 SAP CAP(Node.js) OData V4 서비스입니다. (1단계: 백엔드)

## 설치·실행·테스트

- 설치: `npm install`
- 테스트: `npm test` (테스트가 메모리 SQLite로 서버를 직접 띄우고 끕니다)
- 모델 검증: `npm run build`
- 실행: `npx cds-serve` (`@sap/cds` 패키지의 CLI를 사용하며 `@sap/cds-dk`는 필요하지 않습니다)

## API

서비스 `PurchaseRequestService`는 `/odata/v4/purchase-request`에 노출됩니다.

- 목록: `GET /odata/v4/purchase-request/PurchaseRequests`
- 한 건: `GET /odata/v4/purchase-request/PurchaseRequests(<ID>)`
- 등록: `POST /odata/v4/purchase-request/PurchaseRequests` → `201`
- 수정: `PATCH /odata/v4/purchase-request/PurchaseRequests(<ID>)` → `200`
- 삭제: `DELETE /odata/v4/purchase-request/PurchaseRequests(<ID>)` → `204`

## 필드 규칙

| 필드 | 형식 | 규칙 |
|---|---|---|
| ID | UUID | 자동 생성 |
| title | 문자 100자 | 필수, 공백만 있으면 `400` |
| requester | 문자 60자 | 필수, 공백만 있으면 `400` |
| department | 문자 40자 | 선택 |
| neededBy | 날짜 | 선택, 등록할 때 오늘보다 이전이면 `400` |
| status | 문자 10자 | `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED` 중 하나. 읽기 전용, 등록하면 `DRAFT` |
| createdAt, createdBy, modifiedAt, modifiedBy | | CAP `managed`가 자동 기록 |

## status·삭제 정책

- `status`를 바꾸려는 수정 요청은 오류 없이 무시됩니다(값이 반영되지 않음). 읽기 전용 필드가 섞인 전체 엔터티 PATCH도 그대로 처리하기 위함입니다.
- 삭제는 `status`가 `DRAFT`일 때만 가능합니다. 그 외 상태는 요청 형식은 맞지만 현재 상태 때문에 처리할 수 없으므로 `409`로 거부합니다.

## 이번 단계에서 하지 않는 것

화면, UI5, Fiori Elements, Draft 저장, 승인·반려 동작, 인증(로그인), 초기 샘플 데이터.
