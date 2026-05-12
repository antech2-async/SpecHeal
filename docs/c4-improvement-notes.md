# C4 Architecture Diagram — Improvement Notes

File target: `docs/architecture-c4.md`  
Reviewer: Claude (Cowork)  
Date: 2026-05-12

---

## Prioritas Tinggi

### 1. Hapus Judge / Mentor dari C1 System Context

**Masalah:** Judge dan Mentor saat ini muncul sebagai actor di C1 dengan label "Mengevaluasi demo end-to-end dan bukti teknis". Ini inkonsisten dengan keputusan PRD — Judge dan Mentor bukan product users, mereka evaluator hackathon yang tidak berinteraksi dengan sistem secara regular.

**Perbaikan:** Hapus node `judge["Judge / Mentor<br/>..."]` beserta arrow-nya dari diagram C1. Satu-satunya person actor di C1 adalah QA Engineer.

**Sebelum:**
```mermaid
qa["QA Engineer<br/>Menjalankan scenario dan membaca recovery report"]
judge["Judge / Mentor<br/>Mengevaluasi demo end-to-end dan bukti teknis"]
...
qa -->|"Start run, review report, inspect Jira result"| specheal
judge -->|"Run demo scenario dan nilai evidence"| specheal
```

**Sesudah:**
```mermaid
qa["QA Engineer<br/>Menjalankan scenario, membaca recovery report, dan menindaklanjuti hasil"]
...
qa -->|"Start run, review report, inspect Jira result"| specheal
```

---

### 2. Pindahkan ShopFlow keluar dari SpecHeal System Boundary di C2

**Masalah:** Di C2, node `shopflow` berada di dalam `subgraph boundary["SpecHeal System Boundary"]`. Secara arsitektur, ShopFlow adalah System Under Test (target eksternal), bukan bagian dari SpecHeal. Ini membingungkan reviewer karena boundary SpecHeal terlihat seperti "memiliki" ShopFlow.

**Perbaikan:** Pindahkan `shopflow` ke luar `subgraph boundary`, jadikan sebagai external system seperti `openai` dan `jira`. Tambahkan note inline bahwa untuk MVP keduanya co-located di satu container, tapi secara logis tetap separated.

**Sesudah (struktur subgraph C2):**
```mermaid
subgraph boundary["SpecHeal System Boundary"]
  app["SpecHeal App Container<br/>..."]
  openspec["OpenSpec Files<br/>..."]
  postgres[("PostgreSQL<br/>...")]
end

shopflow["ShopFlow Checkout<br/>Target system / System Under Test<br/>MVP: co-located inside app container"]
openai["OpenAI API<br/>gpt-4o-mini"]
jira["Jira Cloud<br/>Project key: SH"]
```

---

### 3. Reklasifikasi OpenSpec Files di C2

**Masalah:** Dalam C4 Model, "Container" adalah unit yang deployable/runnable (web app, API service, database, background worker, dll). OpenSpec Files adalah static file store yang dibaca oleh app — ini bukan container dalam arti C4.

**Perbaikan:** Ubah label dan classDef OpenSpec Files agar mencerminkan bahwa ini adalah file store/configuration, bukan deployable container. Gunakan notasi mirip dengan PostgreSQL (datastore) atau pisahkan ke external config.

**Opsi A** — Jadikan datastore (paling sederhana):
```mermaid
openspec[("OpenSpec File Store<br/>Behavior contracts untuk ShopFlow dan SpecHeal")]
```
Dengan classDef: `class openspec datastore;`

**Opsi B** — Pindahkan ke luar boundary sebagai "external config source" (lebih strict secara C4).

Opsi A lebih pragmatis untuk MVP dan lebih mudah dimengerti.

---

## Prioritas Sedang

### 4. Tambahkan Technology Labels di C2 Container

**Masalah:** C4 best practice mensyaratkan setiap container dilabeli dengan teknologi yang digunakan, dalam format `[Technology]`. Saat ini teknologi hanya ada di deskripsi prose, tidak di notation formal.

**Perbaikan:** Update label setiap container di C2:

```mermaid
app["SpecHeal App Container\n[Next.js, Node.js, Playwright]\nDashboard, API routes, in-process runner, OpenAI client, Jira publisher"]
postgres[("PostgreSQL\n[PostgreSQL 15]\nRun history, evidence, AI trace, screenshots, patch preview")]
openspec[("OpenSpec File Store\n[Markdown files]\nBehavior contracts untuk ShopFlow dan SpecHeal")]
```

---

### 5. Tambahkan Technology Labels di C3 Component (komponen kritis saja)

**Masalah:** Sama dengan C2 — komponen di C3 tidak memiliki technology annotation.

**Perbaikan:** Tidak perlu semua 12 komponen, cukup komponen paling kritis:

| Komponen | Label yang disarankan |
|---|---|
| Run API | `[Next.js API Route]` |
| Run Repository | `[Prisma ORM, TypeScript]` |
| OpenAI Verdict Engine | `[OpenAI SDK, gpt-4o-mini]` |
| Playwright Runner | `[Playwright, Chromium]` |
| Jira Publisher | `[Jira REST API v3, ADF]` |

---

### 6. Pecah C3 menjadi dua sub-diagram (opsional tapi direkomendasikan)

**Masalah:** C3 saat ini memiliki 30+ edges dalam satu diagram. Ini membuat diagram sulit dibaca dan sulit di-maintain.

**Perbaikan:** Pecah C3 menjadi dua fokus:

- **C3a — Recovery Flow**: Dashboard → Run API → Orchestrator → Playwright → Evidence → DOM Cleaner → OpenSpec Loader → Verdict Engine → Validator → Patcher → Rerun
- **C3b — Persistence & Integration**: Repository → PostgreSQL, Jira Publisher → Jira, Run API → Repository

Kalau tidak mau pecah jadi dua diagram, minimal tambahkan komentar grouping di dalam diagram yang ada.

---

## Prioritas Rendah (Nice to Have)

### 7. Tambahkan Dynamic Diagram untuk Product Bug Flow

**Masalah:** Saat ini hanya Locator Drift yang punya dynamic diagram. Product Bug flow lebih sederhana tapi tetap penting untuk completeness demo.

**Perbaikan:** Tambahkan dynamic diagram singkat (6-8 step) untuk Product Bug scenario:
1. QA starts Product Bug run
2. Playwright fails — payment action unavailable
3. Evidence captured
4. OpenAI returns PRODUCT BUG verdict
5. No validation / no patch
6. Jira Bug created
7. Dashboard shows timeline + bug report

---

### 8. Tambahkan protocol/port label di Deployment Diagram

**Masalah:** Beberapa connection di deployment diagram tidak punya protocol label. `appContainer → pgService` hanya berlabel "Reads/writes run data" tanpa protokol.

**Perbaikan:** Update arrow labels:
- `appContainer -->|"Reads/writes via Prisma, TCP 5432"| pgService`
- `appContainer -->|"HTTPS REST, port 443"| openai`
- `appContainer -->|"HTTPS REST, port 443"| jira`
- `user -->|"HTTPS, port 443"| ingress`

---

## Ringkasan Prioritas

| # | Perubahan | Prioritas | File Section |
|---|---|---|---|
| 1 | Hapus Judge/Mentor dari C1 | 🔴 Tinggi | C1 System Context |
| 2 | Pindahkan ShopFlow ke luar boundary C2 | 🔴 Tinggi | C2 Container |
| 3 | Reklasifikasi OpenSpec sebagai file store (datastore) | 🔴 Tinggi | C2 Container |
| 4 | Tambah technology labels di C2 | 🟡 Sedang | C2 Container |
| 5 | Tambah technology labels di C3 (komponen kritis) | 🟡 Sedang | C3 Component |
| 6 | Pecah C3 jadi dua sub-diagram | 🟡 Sedang | C3 Component |
| 7 | Tambah dynamic diagram Product Bug | 🟢 Rendah | Dynamic Diagrams |
| 8 | Tambah protocol/port di Deployment Diagram | 🟢 Rendah | Deployment Diagram |

---

## Yang Sudah Bagus — Jangan Diubah

- Struktur 5-diagram (C1 + C2 + C3 + Dynamic + Deployment) sudah lengkap dan tepat
- Locator Drift dynamic diagram (16-step) — solid, jangan diubah
- Deployment diagram Kubernetes — struktur pod/service/PVC/Secret sudah benar
- Color coding dan classDef di semua diagram — konsisten dan informatif
- Catatan prose di tiap diagram (keputusan arsitektur) — pertahankan format ini
- Alasan defer C4 Code diagram — sudah didokumentasikan dengan baik
