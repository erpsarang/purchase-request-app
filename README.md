# purchase-request-app
구매요청 간이 관리

구매요청을 등록·조회·수정·삭제하는 SAP CAP(Node.js) OData V4 서비스입니다. (3단계: 상신·승인·반려 — SAP Fiori Elements 화면 포함)

## 설치·실행·테스트

- 설치: `npm install`
- 테스트: `npm test` (테스트가 메모리 SQLite로 서버를 직접 띄우고 끕니다)
- 모델 검증: `npm run build`
- 실행: `npx cds-serve` (`@sap/cds` 패키지의 CLI를 사용하며 `@sap/cds-dk`는 필요하지 않습니다)

## 화면 실행

SAP Fiori Elements(List Report + Object Page) 화면 앱은 `app/purchaserequests/webapp` 아래에 있습니다. 두 터미널에서 각각 실행합니다.

1. `npm run start:cap` — 구매요청 서버 (포트 4004)
2. `npm run start:ui` — 화면 서버 (포트 8080)

브라우저에서 이 컴퓨터(localhost)의 8080 포트 루트 주소를 엽니다(주소 끝에 파일 이름을 붙이지 않습니다). 프록시가 `localhost`를 우회하지 않으면 `NO_PROXY=localhost,127.0.0.1`을 설정합니다.

- UI5 1.153.0 라이브러리는 `ui5.yaml`의 framework 설정에 따라 `@ui5/cli`가 npm에서 받아 이 컴퓨터 서버로만 서빙합니다. 최초 실행 때 약 10초, 291MB를 내려받습니다. 인터넷 CDN은 쓰지 않습니다.
- `@sapui5/*` 패키지는 SAP Developer License 3.2를 따르며, 사용 여부는 사용자가 판단합니다.
- 브라우저 콘솔의 ko_KR 메시지 번들 오류와 lrep/flex 요청 404는 정상이므로 무시해도 됩니다.

## API

서비스 `PurchaseRequestService`는 `/odata/v4/purchase-request`에 노출됩니다.

초안(Draft)을 지원하므로 등록과 수정은 "초안 만들기 → 입력 → 저장(활성화)" 2단계입니다. 키에는 `IsActiveEntity`가 포함됩니다(`true`=활성, `false`=초안).

- 목록: `GET /odata/v4/purchase-request/PurchaseRequests?$filter=IsActiveEntity eq true`
- 한 건: `GET .../PurchaseRequests(ID=<ID>,IsActiveEntity=true)` (활성) 또는 `IsActiveEntity=false` (초안)
- 등록: `POST .../PurchaseRequests` → `201`, 초안(`IsActiveEntity=false`)이 생김. 이어서 `POST .../PurchaseRequests(ID=<ID>,IsActiveEntity=false)/PurchaseRequestService.draftActivate` (본문 `{}`) → `201` 활성
- 수정: `POST .../PurchaseRequests(ID=<ID>,IsActiveEntity=true)/PurchaseRequestService.draftEdit` (본문 `{"PreserveChanges": true}`) → 초안 `PATCH .../PurchaseRequests(ID=<ID>,IsActiveEntity=false)` → `draftActivate`
- 삭제: `DELETE .../PurchaseRequests(ID=<ID>,IsActiveEntity=true)` → `204`

필수값·과거 기한 검사는 초안 저장 단계가 아니라 활성화할 때 수행되며, 위반하면 `400`입니다(실패한 초안은 남습니다).

화면 구성 정의(UI 어노테이션: 목록·상세·입력 칸)는 `app/annotations.cds`에 있습니다.

## 상태 전환 동작 (상신·승인·반려)

세 동작은 활성 레코드에 대해 호출합니다. 활성 레코드 주소 뒤에 서비스 이름을 붙인 동작 이름(`submit`, `approve`, `reject`)으로 POST합니다. 성공하면 본문 없이 `204`를 돌려줍니다. 초안 레코드에는 동작이 없으므로 화면에서는 편집 중에 버튼을 숨깁니다.

| 동작 | 화면 버튼 | 허용 상태 | 결과 상태 |
|---|---|---|---|
| submit | 상신 | `DRAFT` | `SUBMITTED` |
| approve | 승인 | `SUBMITTED` | `APPROVED` |
| reject | 반려 | `SUBMITTED` | `REJECTED` |

- 현재 상태가 허용 상태가 아니면 `409`이고 상태는 그대로입니다.
- 반려에는 반려 사유(`reason`)가 필수입니다. 없거나 공백만 있으면 `400`이고 상태는 그대로입니다. 200자 이하여야 하며, 앞뒤 공백을 지운 값이 `rejectReason`에 저장되어 상세 화면 기본 정보에 "반려 사유"로 보입니다.
- 대상 구매요청이 없으면 `404`입니다.

## 필드 규칙

| 필드 | 형식 | 규칙 |
|---|---|---|
| ID | UUID | 자동 생성 |
| title | 문자 100자 | 필수, 활성화할 때 비었거나 공백만 있으면 `400` |
| requester | 문자 60자 | 필수, 활성화할 때 비었거나 공백만 있으면 `400` |
| department | 문자 40자 | 선택 |
| neededBy | 날짜 | 선택, 활성화할 때 오늘보다 이전이면 `400` |
| status | 문자 10자 | `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED` 중 하나. 읽기 전용, 등록하면 `DRAFT` |
| rejectReason | 문자 200자 | 읽기 전용, 반려할 때 저장, 일반 수정으로 바꿀 수 없음 |
| createdAt, createdBy, modifiedAt, modifiedBy | | CAP `managed`가 자동 기록 |

## status·삭제 정책

- `status`를 바꾸려는 수정 요청은 오류 없이 무시됩니다(값이 반영되지 않음). 읽기 전용 필드가 섞인 전체 엔터티 PATCH도 그대로 처리하기 위함입니다.
- 삭제는 `status`가 `DRAFT`일 때만 가능합니다. 그 외 상태는 요청 형식은 맞지만 현재 상태 때문에 처리할 수 없으므로 `409`로 거부합니다.

## 이번 단계에서 하지 않는 것

로그인(인증), 값 도움말, 품목, 사용자 정의 화면 코드, 초기 샘플 데이터, 사용자·역할 구분, 승인자 기록, 목록 화면 버튼, 상신 후 수정 제한, 이력.
