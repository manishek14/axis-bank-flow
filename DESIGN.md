# DESIGN.md — طراحی معماری BankFlow

> حداکثر ۳ صفحه — BankFlow Challenge 2026

---

## ۱. نمای کلی معماری

BankFlow از معماری **Modular Monolith** پیروی می‌کند: یک اپلیکیشن واحد NestJS با چهار Module مستقل که هر کدام domain خاص خود را مدیریت می‌کنند. این رویکرد سادگی deployment و development را حفظ می‌کند، در عین حال separation of concerns را تضمین می‌نماید.

```
┌─────────────────────────────────────────────────────────┐
│                      AppModule                           │
│  ┌──────────┐ ┌──────────────┐ ┌──────────┐ ┌────────┐ │
│  │ Loans    │ │ Processing   │ │ Reviews  │ │  Jobs  │ │
│  │ Module   │ │ Module       │ │ Module   │ │ Module │ │
│  └──────────┘ └──────────────┘ ┌──────────┘ ┌────────┘ │
│                                                          │
│  ConfigModule (isGlobal) · TypeORM · EventEmitter        │
│  Redis · BullMQ · Swagger · Helmet                       │
└─────────────────────────────────────────────────────────┘
         │                │              │
    PostgreSQL          Redis       Docker Compose
```

ارتباط بین Module‌ها از طریق **dependency injection** مستقیم (LoansService → WorkflowService) و **event-emitter** برای side-effect‌ها (مثلاً expiration scheduling) انجام می‌شود.

---

## ۲. Component‌های اصلی

### LoansModule

مدیریت CRUD درخواست‌های وام و REST API endpoints. شامل Entity‌های `Loan`, `LoanStep`, `LoanHistory` و DTO‌های اعتبارسنجی. `LoansService` عملیات create, process, cancel, resume و findOne را مدیریت می‌کند. Controller در route `/api/v1/loans` ثبت شده.

### ProcessingModule

موتور اجرای Workflow. شامل `WorkflowService` (orchestrator) و پنج `IStepProcessor` implementation. `WorkflowService` بر اساس `loanType` و `amount` مراحل مناسب را تعیین و اجرا می‌کند. هر StepProcessor منطق کسب‌واری اختصاصی خود را دارد و از `BusinessRulesService` برای خواندن قوانین استفاده می‌نماید.

### ReviewsModule

مدیریت تصمیمات بررسی دستی (manual review). `ReviewsService` درخواست‌های با وضعیت `MANUAL_REVIEW` را نمایش و تصمیم approve/reject را ثبت می‌کند. فقط وام‌هایی که در مرحله `MANUAL_REVIEW` هستند قابل بررسی هستند.

### JobsModule

پردازش background با BullMQ. `ExpirationJobService` وام‌های منقضی شده (WAITING_FOR_USER > 7 روز و IN_PROGRESS > 30 روز) را شناسایی و وضعیت آنها به `EXPIRED` تغییر می‌دهد.

---

## ۳. اجرای Workflow

### پردازش Sync (فرآیند اصلی)

فراخوانی `POST /api/v1/loans/{loanId}/process` Workflow را به‌صورت **synchronous** اجرا می‌کند:

1. `LoansService.process()` وام را از دیتابیس بارگذاری می‌کند
2. `WorkflowService.executeWorkflow()` مراحل را تعیین و اجرا می‌نماید
3. هر StepProcessor.execute() نتیجه (PASS / FAIL / MANUAL_REVIEW) را تولید می‌کند
4. در صورت FAIL → وضعیت وام REJECTED، پردازش متوقف
5. در صورت MANUAL_REVIEW → وضعیت وام MANUAL_REVIEW، پردازش متوقف
6. در صورت PASS → مرحله بعدی اجرا می‌شود
7. تمام مراحل PASS → وضعیت وام APPROVED

### پردازش Background (BullMQ)

`ExpirationJobService` به‌صورت periodic (با BullMQ scheduled job یا interval) وام‌های منقضی شده را شناسایی و وضعیت آنها به `EXPIRED` تغییر می‌دهد. این فرآیند async و non-blocking است.

---

## ۴. توسعه‌پذیری Workflow (IStepProcessor Pattern)

رابط `IStepProcessor` هسته توسعه‌پذیری BankFlow است:

```typescript
export interface IStepProcessor {
  readonly stepType: string;
  execute(loan: Loan): StepExecutionResult;
}
```

**اضافه کردن مرحله جدید** (مثلاً AML_CHECK) تنها سه مرحله دارد:

1. ایجاد کلاس جدید: `AmlCheckStepService implements IStepProcessor`
2. ثبت در `ProcessingModule` به‌عنوان provider
3. ثبت در `WorkflowService.stepProcessors` Map + `getWorkflowSteps()`

نیازی به تغییر LoansModule یا ساختار دیتابیس نیست — `LoanStepType` enum یک مقدار جدید می‌گیرد و TypeORM رکورد step را ذخیره می‌کند.

---

## ۵. Data Persistence

### TypeORM + PostgreSQL

سه Entity اصلی:

| Entity | جدول | کاربرد |
|--------|-------|--------|
| `Loan` | `loans` | درخواست وام + وضعیت + currentStage |
| `LoanStep` | `loan_steps` | نتیجه هر مرحله Workflow |
| `LoanHistory` | `loan_histories` | تاریخچه کامل تغییرات |

TypeORM با `synchronize: true` اجرا می‌شود (برای challenge scope مناسب). Entity‌ها از decorator‌های TypeORM (`@Column`, `@Index`, `@OneToMany`) استفاده می‌کنند. فیلد `loanId` (unique business identifier) از `id` (auto-increment PK) جدا است.

---

## ۶. مدیریت State

### LoanStatus — وضعیت واحد هر وام

هر وام فقط **یک** فیلد `status` دارد (LoanStatus enum):

```
SUBMITTED → IN_PROGRESS → APPROVED / REJECTED / MANUAL_REVIEW
                                  ↗ WAITING_FOR_USER → EXPIRED
                                 ↘ CANCELLED
```

وضعیت‌های **terminal** (پردازش متوقف می‌شود): `APPROVED`, `REJECTED`, `MANUAL_REVIEW`, `EXPIRED`, `CANCELLED`.

### Idempotent Processing (FR-9)

قبل از اجرای هر مرحله، `WorkflowService` رکورد `LoanStep` completed قبلی را بررسی می‌کند. اگر مرحله قبلاً اجرا شده باشد:
- نتیجه PASS → مرحله skip شده و ادامه Workflow
- نتیجه FAIL → وضعیت REJECTED بدون اجرای مجدد
- نتیجه MANUAL_REVIEW → وضعیت MANUAL_REVIEW بدون اجرای مجدد

این مکانیزم ensures فراخوانی重复 `POST /process` بدون side-effect است.

---

## ۷. تصمیمات طراحی اصلی

### ۱. IStepProcessor Pattern برای توسعه‌پذیری

هر مرحله Workflow یک کلاس مستقل با رابط `IStepProcessor` است. این رویکرد:
- **Open/Closed Principle**: بدون تغییر کد موجود، مرحله جدید قابل افزودن
- **Testability**: هر StepProcessor مستقل قابل unit test
- **Readability**: منطق هر مرحله در یک فایل متمرکز

### ۲. rules.json — بدون Magic Number

تمام قوانین کسب‌واری از فایل `rules.json` بارگذاری می‌شوند (`BusinessRulesService`). هیچ عدد ثابت در کد وجود ندارد. تغییر قوانین (مثلاً minimumCreditScore از 650 به 700) تنها با تغییر فایل JSON ممکن است، بدون نیاز به rebuild.

### ۳. Modular Monolith به‌جای Microservices

برای scope یک challenge برنامه‌نویسی، Modular Monolith بهترین balance بین سادگی و ساختار است. Module‌ها مستقل هستند اما در یک process اجرا می‌شوند — بدون overhead شبکه، serialization و orchestration. اگر نیاز به split arises، هر Module می‌تواند به Microservice مستقل تبدیل شود.
