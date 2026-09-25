# Stavya clinical system — core analysis for a later master module

Date: 17 September 2026  
Written for the administration pathway, so both sides can merge without rebuilding the clinical file.

MRD design is paused. Nothing new is being added to it. This document is the clinical system that is already running.

## 1. What exists, and what is paused

| Piece | Project | State | Has frontend | Has API | Has database |
| --- | --- | --- | --- | --- | --- |
| Clinical pathway (nursing, physician, fellow, physio, anaesthesia, beds, tasks, handover) | `SSIE 2.0/nursing-module` | Running. This is the system to merge with. | Yes. Vite + React | Yes. Express | Yes. MySQL `ssie_nursing` |
| Digital MRD booklet | `SSIE 2.0/stavya-mrd` | Paused. Not in the nursing app. | Browser only | No | No. Browser storage only |
| Administration pathway | Built by the other team | Not in this repository | — | — | — |

Do not copy clinical tables into a second database. Administration should read and write the same patient, the same employee, and the same event board.

## 2. How the two pathways meet

Clinical owns the stay after admission: bed, pathway, chart, medicines, handover, OT readiness, HDU, clearance, discharge status.

Administration should own what happens around the stay: registration master, billing, tariff, insurance, reception, facility approvals that are not nursing.

The join keys are already fixed. Use these. Do not invent a second patient number.

| Shared fact | Clinical column | Rule for administration |
| --- | --- | --- |
| Hospital person | `users.employee_id` | Same employee code as login. One person, one row. |
| Role | `users.role_id` | Clinical roles are listed in section 5. Admin roles can be added. Do not reuse a clinical role id for a billing role. |
| Patient inside the system | `patients.id` | Internal id. APIs use this. |
| Patient across hospital systems | `patients.uhid` | Unique. This is the master patient key. |
| This admission | `patients.admission_no` | One stay. A later admission is a new row, same UHID. |
| Where they sleep | `patients.floor_id` + `patients.room_bed` | Clinical floor rules in section 7. Admin must not place a conservative patient on 5 or 6. |
| Allergy | `patients.allergy` | Always shown on the clinical chart. Admin registration must send this, not a separate allergy file. |
| Events between modules | `clinical_board` | One row per event. `source_module` says who wrote it. |

If administration creates a patient, call the ADT integration (section 9). Do not insert into `patients` from a private table and expect the ward to see it.

## 3. Running shape

```
Browser  http://<this-Mac>:5173
   |  Vite proxies /api
   v
API      http://127.0.0.1:4100     Express  (nursing-module/server/index.js)
   |
   v
MySQL    database ssie_nursing     server/schema.sql + extra tables in server/setup.js
```

Login is `POST /api/auth/login` with `{ employeeCode, password }`. The response carries a token. Later calls send that token. Sessions live in `sessions` (token is stored as a hash, not the raw token).

Pilot password is `PILOT_PASSWORD` / `SEED_PASSWORD` in `nursing-module/.env`. On the hospital Wi-Fi demo that value is `1234`. Do not use that password in production.

LAN used for the governance demo: UI `http://192.168.7.250:5173`, API port `4100`.

Stack: React 18, Vite 6, React Router 7, Bootstrap. API is Express 5, mysql2, bcrypt. Chart payloads are JSON. There is no ORM.

## 4. Frontend — screens that already exist

File: `nursing-module/src/App.jsx`. A screen opens only if the signed-in role has that resource.

| Screen | Path | Who it is for |
| --- | --- | --- |
| Login | `/` | Everyone |
| Dashboard | `/dashboard` | Role home |
| My patients | `/my-patients` | Assigned nurse |
| Floor | `/floor` | Floor in-charge |
| CNO overview | `/cno` | CNO, ANS |
| Training compliance | `/reports/training` | CNO |
| Ward board | `/ward-board` | Floor census, admit, discharge |
| Patient chart | `/patients/:patientId` | The live clinical record |
| Worklist / tasks | `/worklist`, `/tasks` | Shift work |
| Handover | `/handovers` | Nurse to nurse |
| Escalations | `/escalations` | Clinical concern up the line |
| Support | `/support` | Facility / biomedical request |
| Incidents | `/incidents` | Safety report |
| Clinical desk | `/clinical` | Medical officer |
| Physician desk | `/physician` | Consultant / resident |
| Fellow desk | `/fellow` | Spine fellow |
| Physio desk | `/physio` | Physiotherapy |
| Anaesthesia desk | `/anaesth` | Anaesthetist |
| Staff duty | `/staff` | Who is on the floor |
| Users | `/users` | Admin |
| Permissions | `/permissions` | Admin |
| Shifts | `/shifts` | Shift master |
| Beds | `/admin/beds` | Bed master |
| Admin hub | `/admin` | Admin |
| KPI | `/kpi` | Quality numbers |
| Inbox | `/inbox` | Notifications |
| Audit | `/audit` | Who changed what |

The patient chart tabs are in `src/data/clinicalForms.js`. Each tab writes one `nursing_entries` row. The entry type is the stable name administration and a future MRD can read.

| Chart tab | `nursing_entries.entry_type` |
| --- | --- |
| Initial assessment | `INITIAL_ASSESSMENT` |
| Vitals | `VITALS` |
| EWS | `EWS` |
| Neurological | `NEURO` |
| Pain | `PAIN` |
| Care plan | `CARE_PLAN` |
| Intake / output | `INTAKE_OUTPUT` |
| Fluid balance | `FLUID_BALANCE` |
| Wound | `WOUND` |
| Drain | `DRAIN` |
| Catheter | `CATHETER` |
| IV / lines | `IV_LINES` |
| Risk | `RISK` |
| Education | `EDUCATION` |
| Nursing notes | `NURSING_NOTES` |
| Pre-op | `PRE_OP` |
| Post-op | `POST_OP` |
| HDU | `HDU` |
| Discharge nursing | `DISCHARGE_NURSING` |

Physician, fellow, physio and anaesthesia write more entry types from their own routes (fitness, induction, mobilisation, fellow assessment). Those also land in `nursing_entries` or in `clinical_board`. They are not a second chart.

## 5. Roles

Defined in `src/data/demoData.js` and seeded from `server/orgUsers.js`. Login name is the employee code.

| Role id | Meaning | Example employee code |
| --- | --- | --- |
| `admin` | Master user, users and permissions | 277 |
| `cno` | Chief nursing officer | 185 |
| `ans` | Assistant nursing superintendent | 115 |
| `floorIncharge` | One floor | 123 floor 4, 127 floor 5, 140 floor 6 |
| `seniorNurse` | Senior bedside | seed list |
| `juniorNurse` | Bedside | 181 is floor 6 |
| `medicalOfficer` | MO chart | 306 |
| `clinicalCoordinator` | Coordination | 142 |
| `physician` | Consultant | 1001 |
| `physicianResident` | Resident | 1101 |
| `fellowSurgeon` | Spine fellow | 1201 |
| `seniorFellow` | Senior fellow | 1211 |
| `physiotherapist` | Physio | 1301 |
| `seniorPhysio` | Senior physio | 1311 |
| `anaesthetist` | Anaesthesia, including HDU clear | 1401 |
| `seniorAnaesthetist` | Senior anaesthesia | 1411 |

Permissions are rows in `role_permissions`, not hard-coded only in the browser. The browser file `src/data/permissions.js` is the fallback. The live grant is what the API checks with `permit(resource, action)`.

An administration role must be a new `roles.id`. Give it admission, billing and census rights. Do not give it the right to change pathway or to sign an anaesthesia clearance.

## 6. Database

Database name: `ssie_nursing`. Character set utf8mb4. Schema file: `server/schema.sql`. Setup also creates `staff_duty_assignments` in `server/setup.js`.

### Identity and place

- `roles`, `permissions`, `role_permissions`
- `users` — employee code, password hash, role, floor, shift
- `sessions`
- `floors`, `wards`, `beds`, `shifts`
- `patients` — the admission row. Pathway columns are part of this row, not a side table.

Patient pathway columns that administration must read and must not overwrite on its own:

- `admission_intent` — `conservative` | `surgical` | `rehab`
- `care_pathway` — `conservative` | `preop_surgical` | `rehab` | `postop` | `discharged`
- `pathway_phase` — see section 7
- `hold_reason` — set when a surgical patient is held for medical reasons
- `home_floor_id`, `home_room_bed`, `home_ward_name` — bed to return to after HDU
- `hdu_since`, `anaesth_cleared_at`, `anaesth_cleared_by`
- `source_system` — `manual`, `guide`, or the integration client that admitted them
- `admitted` — false after discharge

### Clinical record

- `nursing_entries` — one clinical observation. `entry_type` + `payload` JSON + who entered it + role + shift + time
- `medication_orders`, `medication_administrations`
- `nurse_assignments`
- `tasks`
- `handovers` — SBAR JSON
- `escalations`
- `clinical_board` — the bus between desks and outside modules

### Hospital support and quality (already in clinical, administration may share)

- `support_requests`, `support_request_events` — raised on the ward, CNO then facility
- `incidents`
- `notifications`
- `audit_logs` — every important write should add a row. Administration writes must do the same.
- `kpi_definitions`, `kpi_results`
- `trainings`, `training_modules`, `training_questions`, `training_enrollments`, `training_attempts`, `competency_passport`
- `staff_duty_assignments` — created at setup, not in `schema.sql`
- `integration_status`

There is no billing table, no tariff table, no insurance claim table, and no reception registration master beyond the patient row. Those belong to the administration pathway.

## 7. Clinical pathway — do not redesign this

Source of truth: `server/pathway.js` and `src/data/carePathway.js`. The API that moves a patient is `POST /api/patients/:patientId/pathway`.

Three ways in:

1. Conservative — ward care, no operation planned.
2. Surgical — pre-op, then theatre, then HDU, then back to the pre-op ward.
3. Rehab — goals, then discharge.

Surgical path after the operation is fixed:

`pre-op` → `in OT` → `HDU observation` → `anaesthetist clears` → `home ward` → `ready for discharge`

Do not send a post-op patient straight back to the ward. Do not skip HDU. Theatre itself is not a module in this app. The ward records that surgery is done; the OT system, when it exists, should call the same pathway action.

Pathway actions the API accepts:

| Action | What it does |
| --- | --- |
| `set_admit` | Sets intent and starting phase |
| `set_phase` | Moves inside the current pathway |
| `hold_preop` | Surgical patient held. Pathway becomes conservative, intent stays surgical, hold reason required |
| `resume_preop` | Hold lifted, back to pre-op |
| `convert_surgical` | Conservative becomes surgical / pre-op |
| `convert_conservative` | Moves to conservative |
| `set_rehab` | Moves to rehab |
| `mark_surgery_done` or `transfer_to_hdu` | Post-op, captures the home bed, asks for an HDU bed |
| `anaesth_clear` | Only if pathway is `postop` |
| `return_to_ward` | Only after anaesthesia clearance, unless an admin force flag is sent |
| `ward_procedure` | Drain, block, or other ward procedure on the conservative path |
| `discharge_pathway` | Closes the pathway |

A pre-op hold is not a discharge and not a new admission. The patient stays surgical in intent so they can return to theatre when fit.

### Floor rule

File: `src/data/floorPolicy.js`.

- Floor 4 is the conservative home.
- Floors 5 and 6 are the pre-op / surgical wards.
- HDU beds are for post-op observation. They are not admit beds.
- If vacant non-HDU beds on floors 5 and 6 are 2 or fewer, a surgical patient may be admitted or moved to floor 4. That is overflow, not a change of the rule.
- Rehab may use floors 4, 5 or 6.
- API check: `POST /api/patients/:patientId/overflow-floor`.

Administration bed allocation must call the same rule. A reception screen that drops every admission on floor 6 will break the census.

## 8. Clinical API the administration module can call

Base: `http://127.0.0.1:4100/api`  
Browser calls go through `/api` on port 5173. A server-side admin app should call port 4100, or the same host behind a shared reverse proxy later.

Authenticated routes need the login token. Machine routes need the integration headers in section 9.

### Auth and census

| Method | Path | Use |
| --- | --- | --- |
| GET | `/health` | API up |
| POST | `/auth/login` | Employee code + password → token |
| POST | `/auth/logout` | Ends session |
| GET | `/auth/me` | Current user and grants |
| GET | `/bootstrap` | Ward load for the signed-in role |
| GET | `/beds` | Bed list |
| PATCH | `/beds/:bedId` | Bed master |

### Patient stay

| Method | Path | Use |
| --- | --- | --- |
| POST | `/patients` | Admit |
| GET | `/patients/:patientId/record` | Full chart bundle |
| PATCH | `/patients/:patientId` | Identity / clinical fields |
| POST | `/patients/:patientId/pathway` | Pathway action from section 7 |
| POST | `/patients/:patientId/overflow-floor` | Floor 4 overflow check |
| POST | `/patients/:patientId/discharge` | Discharge. Sets care status discharged |
| POST | `/patients/:patientId/entries` | Chart row. Body includes `entryType` and `payload` |

### Medicines, work, handover

| Method | Path | Use |
| --- | --- | --- |
| POST | `/patients/:patientId/medications` | New order |
| POST | `/patients/:patientId/medications/:orderId/administer` | Given |
| POST | `/patients/:patientId/medications/:orderId/omit` | Not given, reason required |
| POST | `/assignments` | Nurse to patient |
| POST | `/tasks` | Task |
| PATCH | `/tasks/:taskId` | Update task |
| POST | `/handovers` | SBAR handover |
| PATCH | `/handovers/:handoverId` | Accept |
| POST | `/escalations` | Raise concern |
| PATCH | `/escalations/:escalationId` | Acknowledge / act |

### Desks (same database, role-gated)

| Prefix | Main writes |
| --- | --- |
| `/physician` | Pre-op, post-op, fitness, orders, medicines, lab chase, HDU escalate |
| `/fellow` | Assessment, orders |
| `/physio` | Mobilisation, Body The Mind session, site |
| `/anaesth` | Fitness, convert to surgical, induction, trolley, intra-op medicines, intra-op vitals, extubation, HDU advice, clearance |
| `/clinical-link` | Cross-desk feed, acknowledge, resolve |

Each desk has `GET /bootstrap` and `GET /patients/:patientId/record`.

### Support, quality, staff, audit

| Method | Path |
| --- | --- |
| POST, PATCH | `/support`, `/support/:id` |
| POST | `/incidents` |
| GET, POST, PATCH | `/users`, `/users/:userId`, reset, archive |
| GET, PUT | `/permissions`, `/permissions/:roleId/:permissionId` |
| GET | `/audit` |
| POST | `/kpis`, `/kpis/:kpiId/results` |
| GET, POST | `/staff/duty`, end duty |
| PATCH | `/shifts/:shiftId` |
| GET | `/reports/training-compliance` |
| Training enroll / test / verify | `/training/enrollments/...` |
| GET, POST, PATCH | `/clinical-board` |

## 9. Integration contract — this is how administration syncs

File: `server/integrationClients.js`.

Machine calls send:

- Header `x-integration-client` — client id (`adt`, `mo`, `external`, `physician`, `bridge`, or a new id)
- Header `x-integration-key` — that client's secret

Do not share one key across reception, billing and lab. Add a new client, for example `admin`, with only the scopes it needs.

Scopes that exist today:

| Scope | Allows |
| --- | --- |
| `census:read` | Ward list |
| `board:read` | Clinical board |
| `board:write` | Post an event onto the board |
| `adt:write` | Admit / transfer / discharge message |
| `patient:patch` | Update patient fields |
| `support:write` | Facility request |

Built-in clients, keys from environment, not from this file:

| Client id | Env variable | Intended system |
| --- | --- | --- |
| `adt` | `INTEGRATION_KEY_ADT` | Admission / discharge / transfer |
| `mo` | `INTEGRATION_KEY_MO` | MO desk outside nursing |
| `external` | `INTEGRATION_KEY_EXTERNAL` | Facility / external request |
| `physician` | `INTEGRATION_KEY_PHYSICIAN` | Physician system |
| `bridge` | `INTEGRATION_KEY` | Old single key. Do not use for a new module |

Extra clients can be added with `INTEGRATION_CLIENTS_JSON`.

Integration routes:

| Method | Path | Scope |
| --- | --- | --- |
| GET | `/api/integrations/connections` | Master / CNO, or a valid client |
| GET | `/api/integrations/census` | `census:read` |
| GET | `/api/integrations/clinical-board` | board read |
| POST | `/api/integrations/adt` | `adt:write` |
| POST | `/api/integrations/clinical-board` | `board:write` |
| PATCH | `/api/integrations/clinical-board/:id` | update an event |
| PATCH | `/api/integrations/patients/:patientId` | `patient:patch` |

Suggested administration client when the other team is ready:

```json
{
  "id": "admin",
  "module": "administration",
  "scopes": ["census:read", "adt:write", "patient:patch", "board:write"]
}
```

Do not give `admin` the anaesthesia clear action. Clearance stays a clinical login on `/api/anaesth/.../clearance`.

### Event bus

Table `clinical_board`.

| Column | Meaning |
| --- | --- |
| `patient_id` | Must already exist |
| `source_module` | `nursing`, `physician`, `anaesthesia`, `physio`, `fellow`, or `administration` |
| `event_type` | Stable code, uppercase, no spaces. Example: `BILLING_ESTIMATE_READY` |
| `title` | One line a nurse can read |
| `body` | Plain sentence |
| `payload` | JSON. No secrets |
| `status` | `OPEN` until someone acknowledges it |
| `created_by_name`, `created_by_role` | So the ward sees who sent it |

Clinical connector routing is in `server/clinicalConnector.js`. A new administration event type should be added there if it must raise a nursing task. Posting to the board alone does not assign a nurse.

## 10. What a master module looks like later

One login. One patient. Three doors.

```
Master shell
  ├─ Clinical pathway     (this system, already built)
  ├─ Administration       (other team)
  └─ MRD file             (paused project, join later on UHID)
```

Merge order when both sides are ready:

1. One `users` table. Administration staff are new roles, same `employee_id`.
2. One `patients` table. Reception writes through `/api/integrations/adt`. Ward never retypes UHID.
3. One `clinical_board`. Billing, insurance and consent-for-payment post events. They do not write vitals.
4. Chart stays `nursing_entries`. Administration does not add columns to that table for invoices.
5. Pathway changes stay `POST /api/patients/:id/pathway`. A billing screen must not set `care_pathway` by a direct update.
6. Audit every administration write into `audit_logs`.
7. Floor placement uses section 7. Reception shows the same vacant-bed rule.

Minimum payload administration should send on admit:

- `uhid`
- `admission_no`
- `full_name`, `age`, `gender`
- `consultant`
- `diagnosis`
- `allergy` (NKDA or the drug)
- `admission_intent` — `conservative`, `surgical`, or `rehab`
- requested floor only if it passes the floor rule

The clinical API then assigns `care_pathway` and `pathway_phase`. Administration does not pick the phase.

## 11. MRD — paused, and how it joins later

Stopped on purpose. It is not mounted in the nursing app. The old MRD screens and `/api/mrd` were removed from `nursing-module` so the ward app is not half-merged.

The paused project is `SSIE 2.0/stavya-mrd`.

- Frontend only. Saves in the browser. No MySQL. No login.
- Form numbers are the booklet codes (`STAVYA/MRD/FRM/01` and so on), not the zip folder numbers.
- Official index is the 50-item assembly checklist. Detail is in `stavya-mrd/CORE.md`.
- Eight items are software slots (ECG, echo, radiology, other intervention, laboratory, death certificate, mediclaim, admission slip). Do not redraw those as paper forms.
- Hindi and Gujarati consent pages are signed copies. They are not generated.

When MRD is built for real, it should:

- Read `patients.uhid` and `patients.id`
- Read chart rows it is allowed to copy (assessment, medicines, consent flags)
- Write its own sheets in new tables, for example `mrd_files` and `mrd_sheets`, keyed by `patient_id`
- Not block a pathway step inside nursing until that product is agreed. The ward pathway and the paper file are related. They are not the same lock.

## 12. What is not built

So the other team does not look for it and assume it failed.

- No billing, package, tariff, or receipt tables
- No insurance / TPA claim workflow
- No separate OT module. Surgery is a pathway action plus anaesthesia intra-op notes
- No laboratory instrument interface. Investigations are chart entries and board events
- No PACS / ECG device feed
- No MRD persistence on the server
- No shared master login across a future admin app yet. The contract in section 9 is the bridge until that shell exists
- Guide sample patients (`source_system = guide`) are for demonstration. They are not a live census rule

## 13. Files to open first

| Need | File |
| --- | --- |
| API entry and ports | `nursing-module/server/index.js` |
| Tables | `nursing-module/server/schema.sql` |
| Duty table and seed | `nursing-module/server/setup.js` |
| Pathway rules | `nursing-module/server/pathway.js` |
| Floor rule | `nursing-module/src/data/floorPolicy.js` |
| Chart entry types | `nursing-module/src/data/clinicalForms.js` |
| Roles | `nursing-module/src/data/demoData.js` |
| Staff seed | `nursing-module/server/orgUsers.js` |
| Outside systems | `nursing-module/server/integrationClients.js` |
| Cross-desk events | `nursing-module/server/clinicalConnector.js` |
| Environment | `nursing-module/.env.example` |
| MRD booklet map, paused | `stavya-mrd/CORE.md` |
