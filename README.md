# BankFlow — سامانه پردازش وام

> BankFlow Challenge 2026 — سیستم پردازش درخواست وام با Workflow قابل توسعه

## نمای کلی پروژه

BankFlow یک سیستم پردازش وام (Loan Processing System) است که بر پایه **NestJS + TypeScript + TypeORM + PostgreSQL** ساخته شده و از معماری **Modular Monolith** پیروی می‌کند. این سیستم درخواست‌های وام را از مرحله ثبت تا تصمیم‌گیری نهایی (APPROVED / REJECTED / MANUAL_REVIEW) به‌صورت خودکار پردازش می‌کند.

Workflow پردازش وام شامل مراحل زیر است:

```
VALIDATION → FRAUD_CHECK → GUARANTOR_CHECK → CREDIT_CHECK → FINAL_APPROVAL
```

- وام‌های **PERSONAL**: شامل VALIDATION → FRAUD_CHECK → CREDIT_CHECK (و FINAL_APPROVAL در صورت مبلغ بالا)
- وام‌های **BUSINESS**: شامل GUARANTOR_CHECK اجباری + تمام مراحل فوق

قوانین کسب‌واری از فایل `rules.json` بارگذاری می‌شوند و هیچ عدد ثابت (magic number) در کد وجود ندارد.

---

## پیش‌نیازها

| پیش‌نیاز | نسخه مورد نیاز |
|-----------|----------------|
| Node.js | 20+ |
| Docker & Docker Compose | آخرین نسخه پایدار |
| PostgreSQL | 16 (در Docker ارائه می‌شود) |
| Redis | 7 (در Docker ارائه می‌شود) |
| npm | همراه Node.js |

> **نکته:** برای اجرای локال بدون Docker، باید PostgreSQL و Redis روی سیستم نصب باشند.

---

## ساختار پروژه

```
bankflow/
├── src/
│   ├── main.ts                          # نقطه ورود اپلیکیشن (port 8080)
│   ├── app.module.ts                    # AppModule اصلی (Modular Monolith)
│   ├── health.controller.ts             # GET /health
│   ├── config/
│   │   ├── configuration.ts             # تنظیمات محیطی
│   │   ├── env-validation.ts            # اعتبارسنجی env variables
│   │   └── business-rules.service.ts    # بارگذاری rules.json
│   ├── common/
│   │   └── enums/                       # LoanStatus, LoanStepType, ...
│   └── modules/
│       ├── loans/                        # CRUD وام + Workflow اجرا
│       │   ├── entities/                 # Loan, LoanStep, LoanHistory
│       │   ├── dto/                      # DTOs (Create, Process, Cancel, Resume)
│       │   ├── loans.controller.ts       # REST API endpoints
│       │   ├── loans.service.ts          # Business logic
│       │   └── loans.module.ts
│       ├── processing/                   # Workflow execution engine
│       │   ├── step.interface.ts         # IStepProcessor interface
│       │   ├── workflow.service.ts       # WorkflowService (step orchestration)
│       │   └── steps/                    # Step processors
│       │   │   ├── validation-step.service.ts
│       │   │   ├── fraud-check-step.service.ts
│       │   │   ├── guarantor-check-step.service.ts
│       │   │   ├── credit-check-step.service.ts
│       │   │   └── final-approval-step.service.ts
│       │   └── processing.module.ts
│       ├── reviews/                      # Manual review decisions
│       │   ├── reviews.controller.ts
│       │   ├── reviews.service.ts
│       │   └── reviews.module.ts
│       └── jobs/                         # BullMQ background jobs
│           ├── expiration.job.ts         # ExpirationJobService
│           └── jobs.module.ts
├── rules.json                            # Business rules config
├── docker-compose.yml                    # PostgreSQL + Redis + BankFlow
├── Dockerfile                            # Multi-stage build (Node 20 Alpine)
├── package.json
├── tsconfig.json
└── test/
    ├── app.e2e-spec.ts
    └── jest-e2e.json
```

---

## فناوری‌های استفاده شده

| فناوری | کاربرد |
|---------|--------|
| **NestJS 11** | Framework اصلی backend |
| **TypeScript 5.7** | زبان توسعه |
| **TypeORM 0.3** | ORM و mapping دیتابیس |
| **PostgreSQL 16** | دیتابیس اصلی (ACID compliance) |
| **Redis 7** | Distributed lock + BullMQ backend |
| **BullMQ 5** | Background jobs (expiration) |
| **@nestjs/event-emitter** | Event-driven architecture |
| **@nestjs/config + Joi** | Config management + env validation |
| **class-validator + class-transformer** | DTO validation |
| **Swagger (@nestjs/swagger)** | API documentation |
| **Helmet** | Security headers |
| **Docker Compose** | Deployment orchestration |

---

## دستورالعمل Build

### با Docker Compose (توصیه شده)

```bash
# Build و اجرای تمام سرویس‌ها
docker-compose up --build

# یا در حالت detached
docker-compose up --build -d
```

این دستور سه سرویس را راه‌اندازی می‌کند:
- **postgres**: PostgreSQL روی port 5432
- **redis**: Redis روی port 6379
- **bankflow**: NestJS app روی port 8080

### بدون Docker (توسعه локال)

```bash
# نصب dependencies
npm install

# Build پروژه
npm run build
```

---

## دستورالعمل Run

### با Docker Compose

```bash
docker-compose up

# توقف سرویس‌ها
docker-compose down

# توقف + حذف volumes (دیتابیس ریست می‌شود)
docker-compose down -v
```

### بدون Docker (توسعه локال)

```bash
# تنظیم env variables
export DATABASE_HOST=localhost
export DATABASE_PORT=5432
export DATABASE_USERNAME=postgres
export DATABASE_PASSWORD=4083
export DATABASE_NAME=bankflow
export REDIS_HOST=localhost
export REDIS_PORT=6379
export PORT=8080

# اجرای development mode
npm run start:dev

# اجرای production mode
npm run start:prod
```

سرویس روی `http://localhost:8080` در دسترس خواهد بود.

---

## دستورالعمل Test

```bash
# اجرای Unit tests
npm test

# اجرای tests با watch mode
npm run test:watch

# اجرای tests با coverage report
npm run test:cov

# اجرای E2E tests
npm run test:e2e
```

---

## API Endpoints

| Method | Endpoint | توضیح |
|--------|----------|-------|
| `POST` | `/api/v1/loans` | ایجاد درخواست وام جدید |
| `POST` | `/api/v1/loans/{loanId}/process` | اجرای Workflow پردازش وام |
| `GET` | `/api/v1/loans/{loanId}` | دریافت جزئیات وام |
| `GET` | `/api/v1/loans/{loanId}/history` | دریافت تاریخچه پردازش |
| `POST` | `/api/v1/loans/{loanId}/cancel` | لغو درخواست وام |
| `POST` | `/api/v1/loans/{loanId}/resume` | ادامه درخواست وام (پس از رفع نواقص) |
| `GET` | `/health` | Health check endpoint |
| `GET` | `/api/v1/docs` | Swagger API documentation |

---

## قوانین کسب‌واری (rules.json)

```json
{
  "minimumCreditScore": 650,
  "managerApprovalThreshold": 500000000,
  "incomeMultiplier": 20,
  "manualReview": {
    "minScore": 500,
    "maxScore": 649
  }
}
```

- **minimumCreditScore**: حداقل امتیاز اعتبار مورد نیاز (650)
- **managerApprovalThreshold**: مبلغی که بالاتر از آن نیاز به تأیید مدیر دارد (500,000,000 ریال)
- **incomeMultiplier**: ضریب درآمد ماهانه برای سقف وام (20)
- **manualReview**: امتیاز بین 500-649 → MANUAL_REVIEW

---

## Licenses & Team

- **Author**: Axis-script Team
- **License**: UNLICENSED (Private) -not in Challenge
- **Challenge**: BankFlow Challenge 2026
