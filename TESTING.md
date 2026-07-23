# TESTING.md — استراتژی تست BankFlow

> حداکثر ۱ صفحه — BankFlow Challenge 2026

---

## استراتژی تست

BankFlow از یک رویکرد **layered testing** پیروی می‌کند: Unit Tests → Integration Tests → E2E Tests. هر layer سطح خاصی از abstraction را تأیید می‌کند و confidence کلی را افزایش می‌دهد.

---

## Unit Tests

### Step Processors — منطق کسب‌واری هر مرحله

هر `IStepProcessor` مستقل قابل test است. ورودی یک `Loan` entity و خروجی `StepExecutionResult` است — بدون dependency روی دیتابیس یا سرویس‌های دیگر.

| Service | موارد تست |
|---------|-----------|
| `ValidationStepService` | customerId خالی → FAIL، amount ≤ 0 → FAIL، phone نامعتبر → FAIL، creditScore خارج بازه → FAIL، all valid → PASS |
| `FraudCheckStepService` | customerId در لیست fraud → FAIL، customerId clean → PASS |
| `GuarantorCheckStepService` | BUSINESS بدون guarantor → FAIL، BUSINESS با guarantor → PASS، PERSONAL → PASS (skip) |
| `CreditCheckStepService` | creditScore < 500 → FAIL، 500-649 → MANUAL_REVIEW، ≥ 650 + amount > income×multiplier → FAIL، ≥ 650 + amount ≤ income×multiplier → PASS |
| `FinalApprovalStepService` | amount > threshold → MANUAL_REVIEW، amount ≤ threshold → PASS |

### BusinessRulesService

- بارگذاری rules.json → مقدارهای صحیح
- غیبت rules.json → fallback values
- getter methods → مقدارهای متناسب

---

## Integration Tests

### LoansService — CRUD + Workflow Execution

| مورد تست | توضیح |
|-----------|-------|
| `create()` | ایجاد وام با DTO صحیح → SUBMITTED |
| `process()` — PERSONAL | وام PERSONAL → VALIDATION → FRAUD_CHECK → CREDIT_CHECK → APPROVED |
| `process()` — BUSINESS | وام BUSINESS → GUARANTOR_CHECK اجباری |
| `process()` — high amount | amount > threshold → FINAL_APPROVAL → MANUAL_REVIEW |
| `process()` — FAIL | اعتبار نامعتبر → REJECTED (stop at step) |
| `process()` — idempotent | فراخوانی重复 process → نتیجه یکسان، مرحله‌های completed skip |
| `cancel()` | وام SUBMITTED → CANCELLED |
| `resume()` | وام WAITING_FOR_USER → IN_PROGRESS (re-process) |
| `findOne()` | بازیابی وام با loanId |
| `getHistory()` | بازیابی تاریخچه مراحل |

### WorkflowService — Step Orchestration

- `getWorkflowSteps()` — مراحل متناسب با loanType + amount
- `executeWorkflow()` — sequential execution با stop on FAIL/MANUAL_REVIEW
- Idempotency: مرحله completed skip می‌شود

---

## E2E Tests

### API Flow کامل

| مورد تست | توضیح |
|-----------|-------|
| `POST /api/v1/loans` | ایجاد وام → 201 + loanId |
| `POST /api/v1/loans/{loanId}/process` | پردازش → 200 + نتیجه Workflow |
| `GET /api/v1/loans/{loanId}` | بازیابی جزئیات وام |
| `GET /api/v1/loans/{loanId}/history` | بازیابی تاریخچه |
| `GET /health` | Health check → `{ status: "UP" }` |
| Error handling | 404 for unknown loanId، 400 for invalid DTO |

---

## Untested Areas (محدوده‌های بدون تست)

| محدوده | دلیل |
|--------|-------|
| **Redis Distributed Lock** | Integration با Redis نیازمند test container واقعی |
| **BullMQ Background Jobs** | ExpirationJobService logical اجرا می‌شود اما cron trigger واقعی ندارد |
| **Concurrency Edge Cases** | پردازش همزمان یک وام از دو request — race condition possible |
| **Event-Driven Side Effects** | `@nestjs/event-emitter` events برای expiration scheduling |
| **TypeORM synchronize:true** | Production نیازمند migration testing |
