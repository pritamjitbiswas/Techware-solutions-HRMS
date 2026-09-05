# Build Prompt — Internal HRMS & Attendance Web Application

> Paste this whole document as the opening prompt to a coding agent (Claude Code, Cursor, etc.).
> Build in the phase order given. Do not skip Phase 0.

---

## 1. Context

Build an internal HRMS and attendance system for a single company (~50–500 employees). Single-tenant — no multi-tenancy, no `tenant_id` columns, one deployment, one organisation.

Two clients share one backend:

- **Web app** (desktop browser) — employee self-service, manager approvals, HR/admin console. Punch in/out available here **without** any location capture.
- **Mobile PWA** (phone browser, installable) — punch in/out **with** GPS location captured and stored on every punch. Lightweight: punch, view own attendance, apply leave, view profile.

There is **no biometric device integration**. Do not build device adapters, polling jobs, or `/iclock/` endpoints.

---

## 2. Tech stack (fixed — do not substitute)

| Layer | Technology |
|---|---|
| API | FastAPI, Python 3.12 |
| ORM | SQLAlchemy 2.0 (async) + Alembic migrations |
| Validation | Pydantic v2 |
| Database | PostgreSQL 16 |
| Cache / broker | Redis 7 |
| Background jobs | Celery + Celery Beat |
| Auth | Custom JWT — short-lived access token + rotating refresh token; Argon2 password hashing |
| Admin CRUD | SQLAdmin, mounted at `/admin` |
| Frontend | React 18 + TypeScript + Vite |
| State / data | TanStack Query |
| UI | Tailwind CSS + shadcn/ui |
| Forms | React Hook Form + Zod |
| File storage | S3-compatible (MinIO for local dev) — profile pictures only |
| Packaging | Docker Compose: `api`, `worker`, `beat`, `web`, `postgres`, `redis`, `minio`, `nginx` |

---

## 3. Roles and permissions

Four roles. A user has exactly one role.

| Role | Can do |
|---|---|
| **EMPLOYEE** | Punch in/out, view own attendance and leave balance, apply for leave, raise attendance regularisation, edit own self-service profile fields |
| **MANAGER** | Everything an employee can, plus: view direct reports' attendance, approve/reject their leave and regularisation requests |
| **HR** | Everything a manager can, plus: create/edit all employees, manage shifts, holidays, leave types and balances, run reports, override any attendance record (with reason) |
| **ADMIN** | Everything HR can, plus: user account management, role assignment, system configuration, audit log access |

Enforce with a FastAPI dependency (`require_role(...)`), not with `if` statements scattered in endpoints. Every write endpoint must be permission-checked server-side. Never rely on the frontend hiding a button.

---

## 4. Field ownership — this is a hard rule

Two distinct groups of fields. The API must enforce the split.

### 4.1 Admin/HR-managed (employee CANNOT edit)

Set at user creation or later by HR/Admin only:

- `full_name`
- `employee_code` (unique, e.g. `ACT-0142`)
- `official_email` (login identity)
- `date_of_joining`
- `designation` (FK)
- `department` (FK — e.g. Finance, Engineering, HR, Operations)
- `reporting_manager_id` (FK → employees)
- `employment_type` (Full-time / Part-time / Intern / Contract)
- `shift_id` (FK → shifts)
- `work_location` (Office / Remote / Hybrid)
- `employment_status` (Active / On Notice / Exited)
- `date_of_exit` (nullable)
- `role` (EMPLOYEE / MANAGER / HR / ADMIN)

**Finance sub-block — HR/ADMIN only, never visible to MANAGER or the employee themselves except their own read-only view:**

- `ctc_annual`, `pan_number`, `pf_uan`, `bank_account_number`, `bank_ifsc`, `bank_name`

Store finance fields in a separate `employee_finance` table with its own permission gate — do not put them on the main employee row.

### 4.2 Employee self-service (employee CAN edit)

- `date_of_birth`
- `personal_mobile`
- `personal_email`
- `current_address`, `permanent_address`
- `emergency_contact_name`, `emergency_contact_number`, `emergency_contact_relation`
- `blood_group`
- `profile_picture` (image upload)

**Profile picture rules:** accept JPEG/PNG/WebP only, max 5 MB, validate real content type by magic bytes (not the filename or the client-sent header), strip EXIF, resize to a 512×512 and a 128×128 thumbnail, store in object storage, save only the key in the DB. Serve via pre-signed URL.

If an employee PATCHes an admin-managed field, return **403** — do not silently ignore it.

---

## 5. Data model

Generate Alembic migrations for all of this.

```
departments            (id, name, code, is_active)
designations           (id, title, level, is_active)

employees              (id, employee_code UNIQUE, full_name, official_email UNIQUE,
                        date_of_joining, designation_id FK, department_id FK,
                        reporting_manager_id FK->employees, employment_type,
                        shift_id FK, work_location, employment_status, date_of_exit,
                        date_of_birth, personal_mobile, personal_email,
                        current_address, permanent_address,
                        emergency_contact_name, emergency_contact_number,
                        emergency_contact_relation, blood_group,
                        profile_picture_key, created_at, updated_at)

employee_finance       (employee_id PK FK, ctc_annual, pan_number, pf_uan,
                        bank_account_number, bank_ifsc, bank_name, updated_by, updated_at)

users                  (id, employee_id FK UNIQUE, password_hash, role,
                        is_active, must_change_password, last_login_at)

refresh_tokens         (id, user_id FK, token_hash, expires_at, revoked_at, user_agent)

shifts                 (id, name, start_time, end_time, grace_in_minutes,
                        grace_out_minutes, break_minutes, full_day_minutes,
                        half_day_minutes, crosses_midnight BOOL, is_active)

weekly_offs            (id, shift_id FK, weekday 0-6)

holidays                (id, holiday_date, name, is_optional)

attendance_logs        (id, employee_id FK, punch_time_utc, source ENUM('web','mobile'),
                        direction_hint ENUM('in','out','unknown'),
                        latitude NULL, longitude NULL, accuracy_metres NULL,
                        is_mock_location BOOL NULL, ip_address, user_agent,
                        client_punch_id UNIQUE NULL, server_received_at)
                        -- APPEND ONLY. Never UPDATE. Never DELETE.

attendance_daily       (id, employee_id FK, work_date, shift_id FK,
                        first_in_utc, last_out_utc, worked_minutes, break_minutes,
                        overtime_minutes, late_by_minutes, early_out_minutes,
                        status ENUM('present','absent','half_day','on_leave',
                                    'holiday','weekly_off','pending'),
                        is_manual_override BOOL, override_reason, override_by FK,
                        computed_at, UNIQUE(employee_id, work_date))
                        -- DERIVED. Fully recomputable from attendance_logs.

leave_types            (id, name, code, annual_quota, accrual ENUM('yearly','monthly'),
                        carry_forward_max, is_paid, requires_document, is_active)

leave_balances          (id, employee_id FK, leave_type_id FK, year,
                        opening, accrued, used, pending, closing,
                        UNIQUE(employee_id, leave_type_id, year))

leave_requests          (id, employee_id FK, leave_type_id FK, from_date, to_date,
                        is_half_day, half_day_session ENUM('first','second') NULL,
                        total_days, reason, status ENUM('pending','approved',
                        'rejected','cancelled'), approver_id FK, approver_comment,
                        applied_at, actioned_at)

regularisation_requests(id, employee_id FK, work_date, requested_in_time,
                        requested_out_time, reason,
                        status ENUM('pending','approved','rejected'),
                        approver_id FK, approver_comment, applied_at, actioned_at)

audit_log               (id, actor_user_id FK, entity_type, entity_id, action,
                        before_json, after_json, ip_address, created_at)
```

**Non-negotiable design rules:**

1. `attendance_logs` is immutable and append-only. Corrections happen through `regularisation_requests` or an HR override on `attendance_daily` — never by editing a raw punch.
2. `attendance_daily` is 100% derived. It must be safe to delete every row for a date range and recompute it from `attendance_logs` + shift + leave + holidays, producing identical output.
3. All timestamps stored in **UTC**. Convert to Asia/Kolkata only at the presentation layer.
4. Never hard-delete an employee. Set `employment_status = 'Exited'` and `date_of_exit`.
5. Every write to employees, employee_finance, attendance_daily overrides, leave approvals and role changes writes an `audit_log` row with before/after JSON.

---

## 6. Punch API

Single endpoint, both clients:

```
POST /v1/attendance/punch
Authorization: Bearer <access_token>

{
  "client_punch_id": "uuid-v4",        // idempotency key, required
  "source": "mobile" | "web",
  "direction_hint": "in" | "out",
  "geo": {                              // REQUIRED if source=mobile, MUST be null if source=web
    "latitude": 23.0225,
    "longitude": 72.5714,
    "accuracy_metres": 18.4,
    "is_mock_location": false
  }
}
```

Server behaviour:

- Employee is taken from the JWT. **Never** accept an `employee_id` in the body.
- `punch_time_utc` is set by the **server**, not the client. Ignore any client-supplied timestamp.
- If `client_punch_id` already exists, return `200` with the existing record — do not create a duplicate. This makes offline mobile replay safe.
- If `source == "mobile"` and `geo` is missing → `422`.
- If `source == "web"` → store `latitude`, `longitude`, `accuracy_metres` as `NULL`. Reject the request with `422` if a web client sends a geo block.
- `direction_hint` is a hint only. The compute engine derives real in/out from punch ordering within the shift-day window.
- Reject a second punch within 60 seconds of the previous one for the same employee → `409 Too Soon`.
- Fire an async Celery task to recompute `attendance_daily` for that employee and work date.

Geo is **recorded and displayed**, not enforced. Do not block a punch for being far from an office. Store the coordinates, show them to the manager on the attendance detail view, and let the manager judge. Set a `geo_flag` of `low_accuracy` when `accuracy_metres > 100` and `mock_detected` when `is_mock_location` is true.

---

## 7. Attendance compute engine

The heart of the system. Build it as a pure function, isolated from FastAPI, fully unit-testable:

```python
def compute_daily(
    employee: Employee,
    work_date: date,
    punches: list[AttendanceLog],
    shift: Shift,
    weekly_offs: set[int],
    holiday: Holiday | None,
    approved_leave: LeaveRequest | None,
) -> AttendanceDaily:
    ...
```

Rules:

- **Shift-day attribution.** For a shift with `crosses_midnight = True`, the shift-day window runs from `shift.start_time − 4h` to `shift.end_time + 4h`. A punch at 02:00 belongs to the previous calendar day's shift. Attribute punches by this window, never by naive calendar date.
- **In/out derivation.** Sort punches ascending within the window. First punch = in, last punch = out. Odd number of punches → last punch-out missing → status `pending`, flag for regularisation.
- **Precedence for status:** approved leave > holiday > weekly off > computed attendance.
- **Late / early:** compare against `shift.start_time + grace_in_minutes` and `shift.end_time − grace_out_minutes`.
- **Half day:** `worked_minutes >= half_day_minutes` but `< full_day_minutes`.
- **Absent:** no punches, not on leave, not a holiday, not a weekly off.
- **Overtime:** `worked_minutes − full_day_minutes`, floored at 0.
- Approved regularisation overrides derived in/out times, sets `is_manual_override = True`, records reason and approver.

**Write these tests before writing the frontend:**

1. Normal day shift, in and out on time
2. Night shift 22:00–06:00 crossing midnight
3. Missing punch-out → `pending`
4. Four punches (lunch break out/in) → first-in/last-out used
5. Punch on an approved leave day → leave wins
6. Punch on a declared holiday → holiday wins
7. Late arrival inside grace window → not marked late
8. Late arrival one minute outside grace → marked late
9. Duplicate `client_punch_id` replayed → single log row
10. Employee with no shift assigned → clear error, not a crash
11. Recompute idempotency: run twice, identical output
12. Half-day threshold boundary, exactly at the minute

---

## 8. API surface

```
POST   /v1/auth/login                      → access + refresh token
POST   /v1/auth/refresh
POST   /v1/auth/logout
POST   /v1/auth/change-password

GET    /v1/me                              → own profile
PATCH  /v1/me                              → self-service fields ONLY (403 on admin fields)
POST   /v1/me/profile-picture              → multipart upload
GET    /v1/me/attendance?from=&to=
GET    /v1/me/leave-balance

POST   /v1/attendance/punch
GET    /v1/attendance/today                → current status, last punch, elapsed time
GET    /v1/attendance/{employee_id}?from=&to=     (manager: reports only; HR: all)
PATCH  /v1/attendance/daily/{id}/override  (HR/ADMIN, reason required)

POST   /v1/leave/requests
GET    /v1/leave/requests?status=
POST   /v1/leave/requests/{id}/approve
POST   /v1/leave/requests/{id}/reject
POST   /v1/leave/requests/{id}/cancel

POST   /v1/regularisations
GET    /v1/regularisations?status=
POST   /v1/regularisations/{id}/approve
POST   /v1/regularisations/{id}/reject

POST   /v1/employees                       (HR/ADMIN) → creates employee + user account
GET    /v1/employees?department=&status=&q=
GET    /v1/employees/{id}
PATCH  /v1/employees/{id}                  (HR/ADMIN)
GET    /v1/employees/{id}/finance          (HR/ADMIN only)
PATCH  /v1/employees/{id}/finance          (HR/ADMIN only)

CRUD   /v1/shifts, /v1/holidays, /v1/departments, /v1/designations, /v1/leave-types  (HR/ADMIN)

GET    /v1/reports/attendance-summary?month=&department=   → JSON + ?format=xlsx
GET    /v1/reports/leave-summary?year=
GET    /v1/audit-log                       (ADMIN)
```

---

## 9. Frontend

### 9.1 Mobile PWA (primary punch surface)

Follow the interaction patterns common to Keka and Zoho People — do **not** copy their assets, branding, colours or copy. Build original UI using these patterns:

- **Home screen dominated by one large circular punch button.** It reads `CHECK IN` when clocked out and `CHECK OUT` when clocked in. Colour changes state.
- Directly under the button: a live elapsed timer since check-in, today's shift window (e.g. `09:30 – 18:30`), and today's first-in time.
- A vertical timeline below showing today's punches with time and a small location pin per punch.
- Bottom tab bar: **Home · Attendance · Leave · Profile**.
- Attendance tab: month calendar, each date colour-coded by status (present / absent / half-day / leave / holiday / weekly-off). Tapping a date opens the detail sheet with punch times and map pins.
- Leave tab: balance cards per leave type at the top, apply button, request history below with status chips.
- Profile tab: photo, name, employee code, designation, department, manager — read-only; then an editable section for the self-service fields.
- Request geolocation permission **on first punch attempt**, not on app open. If permission is denied, show a clear explanation and block the mobile punch (web punch remains available).
- Must work as an installable PWA with a service worker. Queue punches made while offline in IndexedDB with their `client_punch_id` and replay on reconnect.

### 9.2 Web app

- **Employee:** dashboard with today's status and a punch button (no location capture), monthly attendance table, leave application and history, profile with the self-service section.
- **Manager:** team attendance grid (employees × days, colour-coded), a pending-approvals queue for leave and regularisation with bulk approve.
- **HR/Admin:** employee list with filters and search; **create-employee wizard** — Step 1 basic info, Step 2 job details (designation, department, manager, shift, employment type), Step 3 finance (optional), Step 4 account and role — which provisions the login and emails a temporary password with `must_change_password = True`. Plus configuration screens for shifts, holidays, leave types, departments, designations. Plus reports with XLSX export.
- Mount SQLAdmin at `/admin` for raw table access as an ADMIN-only escape hatch.

---

## 10. Background jobs

- **Nightly 01:30 IST** — recompute `attendance_daily` for the previous day for all active employees.
- **Nightly 02:00 IST** — mark absent any employee with no punches, no leave, and a working day.
- **Monthly 1st 00:30 IST** — accrue leave balances, roll over carry-forward up to each type's cap.
- **On punch (async)** — recompute that employee's `attendance_daily` for the affected work date.
- **Hourly** — email/notify managers with pending approvals older than 24 hours.

---

## 11. Non-functional requirements

- All secrets from environment variables. Commit a `.env.example`, never a `.env`.
- Rate-limit `/v1/auth/login` to 5 attempts per 15 minutes per IP+email, and `/v1/attendance/punch` to 10 per minute per user.
- Structured JSON logging with a request ID on every log line.
- `/healthz` (liveness) and `/readyz` (checks Postgres and Redis).
- OpenAPI docs auto-generated; enable Swagger UI in dev only.
- Alembic migrations for every schema change — no `create_all()` in application code.
- Seed script creating: one ADMIN, one HR, one MANAGER, three EMPLOYEEs, two shifts (one day, one night crossing midnight), five leave types, the current year's holiday list, and 30 days of realistic sample punches.
- Test coverage: 90%+ on the compute engine, 70%+ overall.
- `README.md` with local setup in under five commands.

---

## 12. Build order

**Phase 0 — foundation.** Repo layout, Docker Compose, Postgres + Redis up, SQLAlchemy models, Alembic initial migration, seed script, `/healthz`. Stop and verify the stack runs before continuing.

**Phase 1 — auth and employees.** JWT login/refresh/logout, RBAC dependency, employee CRUD with the admin/self-service field split enforced, profile picture upload, SQLAdmin mounted, audit logging. Ship the create-employee wizard API.

**Phase 2 — attendance core.** Punch endpoint with idempotency, `attendance_logs`, the compute engine as a pure function, all twelve unit tests green, Celery recompute task, nightly jobs. **Do not start the frontend until all twelve tests pass.**

**Phase 3 — leave and regularisation.** Leave types, balances, accrual job, apply/approve/reject/cancel flow, regularisation flow, precedence rules wired into the compute engine.

**Phase 4 — web frontend.** Employee → manager → HR/admin, in that order.

**Phase 5 — mobile PWA.** Punch screen, geolocation, offline queue with IndexedDB replay, service worker, install prompt.

**Phase 6 — reports and polish.** XLSX exports, attendance summary, leave summary, audit log viewer, notification emails.

---

## 13. Acceptance criteria

The build is done when:

- An admin can create an employee through the wizard and that employee receives working credentials.
- That employee can punch in from a phone, the punch stores latitude/longitude, and the manager can see the coordinates on the attendance detail view.
- The same employee can punch in from a desktop browser and **no** location data is stored for that punch.
- The employee cannot change their own designation, shift, department or employee code via the API — the attempt returns 403.
- The employee can update their date of birth, address, mobile number and profile picture.
- Deleting every `attendance_daily` row for last month and re-running the recompute job reproduces byte-identical results.
- A night shift punch at 02:00 is attributed to the previous day's shift.
- An approved leave overrides a punch on the same day.
- All twelve compute-engine tests pass.
- Every employee edit, leave approval and attendance override appears in the audit log with before/after values.

---

## 14. Ask before assuming

If any of the following is unclear, ask rather than guess:

- Leave policy specifics: quotas per type, accrual timing, carry-forward caps, encashment
- Whether managers may see finance fields (default: **no**)
- Whether a second-level approval is needed above the reporting manager
- Overtime policy: is OT paid, capped, or approval-gated
- Notification channel: email only, or also WhatsApp/Slack

---

## Build status (as of 2026-08-06)

Phase 0 is complete and locally verified (venv + local npm, since Docker Desktop was not yet installed on the build machine — install it and run the 4 setup commands in `README.md` to bring the full stack up):

- Repo layout, `.gitignore`, `.env.example`, `README.md`
- `docker-compose.yml` for all 8 services
- FastAPI skeleton with `/healthz` + `/readyz`
- All 16 SQLAlchemy models from section 5
- Hand-written initial Alembic migration (needs diffing against autogenerate once Postgres is reachable)
- Idempotent seed script (roles, shifts, leave types, holidays, 30 days of sample punches)
- Celery app skeleton for `worker`/`beat`
- Minimal React/TS/Vite/Tailwind placeholder for `web`

Not started: Phase 1 (auth, RBAC, employee CRUD, SQLAdmin, audit log) onward.
