# ENGINEERING_DECISIONS.md — تصمیمات مهندسی BankFlow

> حداکثر ۲ صفحه — BankFlow Challenge 2026

---

## ۱. چرا Modular Monolith؟

### تصمیم: Modular Monolith به‌جای Microservices

**دلیل انتخاب:** برای scope مسابقه BankFlow Challenge 2026، یک اپلیکیشن واحد با Module‌های مستقل بهترین گزینه است. مزایا:

- **Deployment ساده:** `docker-compose up` — یک container، یک process
- **Development سریع:** بدون شبکه بین سرویس‌ها، بدون serialization overhead
- **Refactoring آسان:** تغییر بین Module‌ها در یک codebase امکان‌پذیر
- **Testing یکپارچه:** Integration tests بدون network mocking

**Alternative‌های بررسی شده:**

| Alternative | مزایا | معایا | دلیل رد |
|-------------|-------|-------|---------|
| Microservices | Scale مستقل، isolation کامل | Network overhead، deployment پیچیده، orchestration ضروری | Over-engineering برای challenge scope |
| Split per Bank (multi-tenant) | Data isolation per bank | Tenant management پیچیده، code duplication | نیازمند infrastructure اضافی، خارج scope |

**نکته:** Module‌ها به‌صورت مستقل طراحی شده‌اند. اگر در future نیاز به split arises، هر Module (Loans, Processing, Reviews, Jobs) می‌تواند به Microservice مستقل تبدیل شود بدون تغییر منطق کسب‌واری.

---

## ۲. مدل‌سازی Workflow — Step Processor Pattern

### تصمیم: IStepProcessor Interface + WorkflowService Orchestration

هر مرحله Workflow یک کلاس مستقل با رابط `IStepProcessor`:

```typescript
export interface IStepProcessor {
  readonly stepType: string;
  execute(loan: Loan): StepExecutionResult;
}
```

`WorkflowService` به‌عنوان orchestrator مراحل را به‌صورت sequential اجرا می‌کند و نتیجه هر مرحله را ذخیره و بررسی می‌نماید.

**Alternative‌های بررسی شده:**

| Alternative | مزایا | معایا | دلیل رد |
|-------------|-------|-------|---------|
| State Machine (XState) | Visualization، formal verification | Dependency اضافی، learning curve، over-engineering برای 5 step | پیچیدگی غیرضروری |
| Hardcoded Workflow | ساده، سریع | Non-extensible، تغییر نیازمند refactor کد | نقض Open/Closed Principle |

**مزایای IStepProcessor:** اضافه کردن مرحله جدید (مثلاً AML_CHECK) نیازمند سه اقدام ساده است — بدون تغییر LoansModule یا API endpoints.

---

## ۳. Business Rules از Config File

### تصمیم: rules.json بارگذاری در Startup

فایل `rules.json` در startup توسط `BusinessRulesService` بارگذاری می‌شود. هیچ magic number در کد وجود ندارد — تمام قوانین کسب‌واری (minimumCreditScore, managerApprovalThreshold, incomeMultiplier, manualReview range) از این فایل خوانده می‌شوند.

**Alternative‌های بررسی شده:**

| Alternative | مزایا | معایا | دلیل رد |
|-------------|-------|-------|---------|
| Environment Variables | Standard 12-factor app | عددی thresholds در env verbose، type casting لازم، nested config (manualReview) دشوار | Nested structures و numeric thresholds مناسب env نیست |
| Database Table | Dynamic، runtime update | Dependency روی seed data، migration لازم، query overhead | برای challenge scope over-engineering |
| Hardcoded | سریع، ساده | Non-configurable، تغییر نیازمند rebuild | نقض deployability |

**مزایای rules.json:** تغییر قوانین بدون rebuild ممکن، nested structure پشتیبانی می‌شود، fallback values در کد وجود دارد (در صورت غیبت فایل).

---

## ۴. مدیریت State

### تصمیم: LoanStatus Enum — وضعیت واحد + Idempotent Processing

هر وام فقط **یک** فیلد `status` (LoanStatus enum) دارد. وضعیت‌های terminal (APPROVED, REJECTED, MANUAL_REVIEW, EXPIRED, CANCELLED) پردازش را متوقف می‌کنند.

**Idempotency (FR-9):** قبل از اجرای هر مرحله، `WorkflowService` رکورد `LoanStep` completed قبلی را بررسی می‌کند. فراخوانی重复 `POST /process` بدون side-effect — مرحله‌ای که قبلاً PASS شده skip می‌شود، مرحله‌ای که FAIL شده بدون اجرای مجدد REJECTED remains.

**Alternative‌های بررسی شده:**

| Alternative | مزایا | معایا | دلیل رد |
|-------------|-------|-------|---------|
| Event Sourcing | Audit trail کامل، temporal queries | Complexity بالا، storage overhead، rehydration لازم | Over-engineering برای challenge scope |
| CQRS | Read/Write separation، optimized queries | Two data models، consistency challenges | Complexity غیرضروری |
| Multiple Status Fields | Granular state tracking | Ambiguity، conflicting states | Ambiguity و data inconsistency risk |

---

## ۵. سه Trade-off اصلی

### Trade-off 1: Sync Processing vs Async BullMQ

**تصمیم:** هر دو — Workflow اصلی sync، expiration async

Workflow پردازش وام **synchronous** اجرا می‌شود (فراخوانی API → نتیجه فوری). این تصمیم برای user experience ضروری است — کاربر نتیجه process را در response همان request دریافت می‌کند.

Expiration وام‌ها **asynchronous** با BullMQ اجرا می‌شود — non-blocking و periodic. اگر Workflow async بود، کاربر باید polling کند که UX ضعیفی دارد.

### Trade-off 2: PostgreSQL vs SQLite

**تصمیم:** PostgreSQL

SQLite برای development ساده‌تر است اما:
- ACID compliance کامل در PostgreSQL (concurrent access)
- TypeORM features کامل با PostgreSQL (bigint، enum، index)
- Docker deployment با PostgreSQL standard است
- Redis distributed lock نیازمند infrastructure واقعی

### Trade-off 3: Modular Monolith vs Microservices

**تصمیم:** Modular Monolith

برای challenge scope: سادگی deployment، development speed و testing یکپارچه مهم‌تر از scale مستقل است. اگر پروژه production-level شود، Module‌ها می‌توانند split شوند.

---

## ۶. محدودیت‌های فعلی

- **Distributed Lock:** Redis lock infrastructure در کد آماده شده اما integration test ندارد
- **BullMQ Scheduling:** ExpirationJobService logical اجرا می‌شود اما cron scheduling real در challenge scope فعال نیست
- **Concurrency Edge Cases:** پردازش همزمان یک وام از دو request ممکن است race condition ایجاد کند (Redis lock mitigation planned)
- **TypeORM synchronize:true:** مناسب development/challenge اما production نیازمند migration strategy

---

## ۷. توسعه در Future

اضافه کردن مرحله جدید (مثلاً **AML_CHECK**) تنها سه مرحله دارد:

1. `AmlCheckStepService implements IStepProcessor` — منطق کسب‌واری
2. ثبت در `ProcessingModule` providers
3. ثبت در `WorkflowService.stepProcessors` Map + `getWorkflowSteps()`

```typescript
// مثال: اضافه کردن AML_CHECK
this.stepProcessors.set(LoanStepType.AML_CHECK, this.amlCheckStep);
// و در getWorkflowSteps():
steps.splice(1, 0, LoanStepType.AML_CHECK); // بین VALIDATION و FRAUD_CHECK
```

نیازی به تغییر LoansModule، API endpoints یا دیتابیس schema نیست — `LoanStepType` enum یک مقدار جدید می‌گیرد.
