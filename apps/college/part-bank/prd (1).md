## Product Requirements Document (PRD) — Part Bank API

### 1. Overview

- **Goal**: Provide a minimal banking-style API to handle user auth, multiple deposit accounts per user, and a read-only transaction feed.
- **Out of scope**: Real payment processing, inter-bank transfers, external integrations.

### 2. High-Level Functional Requirements

- **Authentication**: Sign up, login to receive a bearer token, logout to invalidate the token.
- **Deposit Account**: Create, retrieve (list), delete (single or all).
- **Transactions**: List transactions associated with user’s deposit account with pagination and filters.

### 3. Non-Functional Requirements

- **Security**: HTTPS only; Bearer auth; strong password hashing (argon2id/bcrypt).
- **Performance**: P95 < 300ms for simple reads; P95 < 600ms for account creation.
- **Rate Limiting**: Per-IP and per-user. Example: 100 req/15m general, 10 login attempts/15m.
- **Availability**: Service handles transient failures and returns clear 5xx on server errors.
- **Observability**: Correlation ID, structured logs, exclude sensitive fields.
- **Internationalization**: Unicode support in text fields.

### 4. API Conventions

- **Base URL**: `<BASE_URL>`
- **Content Type**: `application/json; charset=utf-8`
- **Auth Header**: `Authorization: Bearer <token>` for protected endpoints.
- **Response Envelope**:
  - Success: `{ "data": <payload>, "meta": <optional> }`
  - Error: `{ "error": { "code": "<ERR_CODE>", "message": { fa: "<human message>", en: "<human message>" }, "details": <optional> }, "meta": <optional> }`
- **Timestamps**: ISO 8601 `YYYY-MM-DDTHH:mm:ss.sssZ`
- **Money**: Integers representing minor units (e.g., rials).

### 5. Endpoints

#### 5.1 Authentication

##### POST /auth/sign-up

- **Purpose**: Create a user account
- **Auth**: Public
- **Request**:

```json
{
  "firstName": "string",
  "lastName": "string",
  "idNumber": "string",
  "phoneNumber": "string",
  "password": "string"
}
```

- **Validation**:
  - firstName, lastName: 1..100 chars (Unicode letters/spaces/hyphens)
  - idNumber: 10..20 digits
  - phoneNumber: regex: /^09\d{9}$/
  - password: 6..128 chars; store as hash
- **Responses**:
  - 201 Created

```json
{
  "data": {
    "userId": "uuid",
    "phoneNumber": "string",
    "firstName": "string",
    "lastName": "string",
    "createdAt": "2025-09-22T10:00:00Z"
  }
}
```

- 400/422 Validation error; 409 Conflict (phone exists)

##### POST /auth/login

- **Purpose**: Issue bearer token
- **Auth**: Public
- **Request**:

```json
{ "phoneNumber": "string", "password": "string" }
```

- **Responses**:
  - 200 OK

```json
{
  "data": {
    "token": "string",
    "expiresIn": 3600,
    "user": {
      "userId": "uuid",
      "phoneNumber": "string",
      "firstName": "string",
      "lastName": "string"
    }
  }
}
```

- 401 Unauthorized (invalid credentials)

##### POST /auth/logout

- **Purpose**: Invalidate token
- **Auth**: Required
- **Request**: Empty
- **Responses**: 204 No Content; 401 if token invalid/expired

#### 5.2 Deposit Account

##### POST /deposit-account

- **Purpose**: Create a new deposit account for the authenticated user (multiple allowed)
- **Auth**: Required
- **Request**: `multipart/form-data`

  - Fields:
    - `firstName` (text)
    - `lastName` (text)
    - `address` (text)
    - `postalCode` (text)
    - `nationalCardImage` (file) — image of national ID card

- **Validation**:
  - firstName, lastName: 1..100 chars
  - address: 1..300 chars
  - postalCode: 5..12 digits
  - nationalCardImage: MIME type `image/jpeg` or `image/png`; max size 5 MB; exactly one file
- **Behavior**: System augments with generated fields (cardNumber Luhn-valid, balance, score, upcomingInstalment). Store file securely; return only metadata (not binary) in response.
- **Responses**:
  - 201 Created

```json
{
  "data": {
    "accountId": "uuid",
    "userId": "uuid",
    "firstName": "string",
    "lastName": "string",
    "address": "string",
    "postalCode": "string",
    "cardNumber": "string",
    "balance": 71000000,
    "score": { "amount": 11000000, "paymentPeriod": 12 },
    "upcomingInstalment": { "amount": 1000000, "dueDate": "20250108" },
    "document": {
      "type": "nationalCardImage",
      "contentType": "image/jpeg",
      "size": 123456,
      "id": "file-id"
    },
    "createdAt": "2025-09-22T10:00:00Z"
  }
}
```

- 400/422 Validation error; 413 Payload Too Large (file > 5 MB)

##### GET /deposit-account

- **Purpose**: Retrieve the list of the user’s deposit accounts
- **Auth**: Required
- **Query (optional)**:
  - `page` integer >= 1 (default 1)
  - `pageSize` integer 1..100 (default 50)
- **Responses**:
  - 200 OK

```json
{
  "data": [
    {
      "accountId": "uuid",
      "userId": "uuid",
      "firstName": "string",
      "lastName": "string",
      "address": "string",
      "postalCode": "string",
      "cardNumber": "string",
      "balance": 71000000,
      "score": { "amount": 11000000, "paymentPeriod": 12 },
      "upcomingInstalment": { "amount": 1000000, "dueDate": "20250108" },
      "createdAt": "2025-09-22T10:00:00Z",
      "updatedAt": "2025-09-22T10:00:00Z"
    }
  ],
  "meta": { "page": 1, "pageSize": 50, "totalItems": 2, "totalPages": 1 }
}
```

##### DELETE /deposit-account

- **Purpose**: Delete deposit account(s)
- **Auth**: Required
- **Behavior**:
  - If `accountId` query parameter is provided, delete only that account (owned by the user)
  - If no `accountId` is provided, delete all deposit accounts owned by the user
- **Query (optional)**:
  - `accountId` uuid
- **Responses**:
  - 204 No Content (deletion performed; deleting none is also 204 for idempotency)
  - 404 Not Found (when `accountId` provided but does not exist or not owned by user)

#### 5.3 Transactions

##### GET /transactions

- **Purpose**: List transactions for the user’s deposit account
- **Auth**: Required
- **Query**:
  - `page` integer >= 1 (default 1)
  - `pageSize` integer 1..100 (default 20)
  - `type` enum ["deposit","withdraw"] (optional)
  - `startDate` ISO datetime (optional)
  - `endDate` ISO datetime (optional)
  - `minAmount` integer >= 0 (optional)
  - `maxAmount` integer >= 0 (optional)
- **Validation**:
  - `startDate <= endDate` if both present
  - `minAmount <= maxAmount` if both present
- **Response**:

```json
{
  "data": [
    {
      "transactionId": "uuid",
      "accountId": "uuid",
      "type": "deposit",
      "date": "2024-07-17T12:53:35Z",
      "amount": 863937943
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 123, "totalPages": 7 }
}
```

- 404 if user has no deposit account (or return empty list; choose one behavior and keep consistent)

### 6. Data Models

#### 6.1 User

- `userId` uuid
- `phoneNumber` string (unique, normalized)
- `firstName` string
- `lastName` string
- `idNumber` string
- `passwordHash` string
- `status` enum ["active","locked","disabled"]
- `createdAt`, `updatedAt` ISO datetime

#### 6.2 DepositAccount

- `accountId` uuid
- `userId` uuid (user can have many accounts)
- `firstName` string
- `lastName` string
- `address` string
- `postalCode` string
- `cardNumber` 16-digit string (Luhn-valid, unique)
- `balance` integer >= 0
- `score` { `amount`: integer >= 0, `paymentPeriod`: enum [12,24,48] }
- `upcomingInstalment` { `amount`: integer >= 0, `dueDate`: string "YYYYMMDD" }
- `createdAt`, `updatedAt` ISO datetime

#### 6.3 Transaction

- `transactionId` uuid
- `accountId` uuid (FK to DepositAccount)
- `type` enum ["deposit","withdraw"]
- `date` ISO datetime
- `amount` integer >= 0

### 7. Validation Rules

- Names: 1..100 chars; Unicode letters/spaces/hyphens; trim whitespace
- Address: 1..300 chars
- Postal code: 5..12 digits only
- Phone number: consistent canonical format (e.g., E.164 or `09...`); uniqueness enforced
- Password: 6..128 chars; strong hashing; never store plaintext
- Card number: generated; must pass Luhn; unique
- Monetary: non-negative integers in minor units
- Dates: ISO 8601 for timestamps; `YYYYMMDD` for `upcomingInstalment.dueDate`

### 8. Pagination and Sorting

- Requests: `page`, `pageSize`
- Responses: `meta.page`, `meta.pageSize`, `meta.totalItems`, `meta.totalPages`
- Transactions default sort: `date DESC`, secondary `transactionId`

### 9. Error Handling

- Status codes: 200, 201, 204, 400, 401, 403, 404, 409, 413, 422, 429, 5xx
- Error shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "postalCode must be 5..12 digits",
    "details": [
      {
        "field": "postalCode",
        "message": {
          "fa": "فقط باید عدد باشد",
          "en": "Must contain digits only"
        }
      }
    ]
  }
}
```

### 10. Security

- HTTPS-only; HSTS recommended
- Bearer tokens (opaque or JWT with `exp`)
- Token storage: Authorization header
- Brute-force protection: lockouts/backoff for repeated login failures
- PII protection: redact sensitive fields in logs; mask card numbers except last 4

### 11. Idempotency and Concurrency

- Optional `Idempotency-Key` for `POST /deposit-account` to avoid duplicate creates
- Optimistic locking via `updatedAt`/ETag if update endpoints are added later

### 12. Persistence and Indexes

- Tables/collections: Users, DepositAccounts, Transactions
- Unique indexes: `users.phoneNumber`, `deposit_accounts.cardNumber`
- Indexes: `deposit_accounts.userId`, `transactions.accountId`, `transactions.date`

### 13. Example Flows

1. Sign up → Login → Create deposit account → Get deposit account → List transactions → Delete deposit account → Logout

### 14. swagger
