## Context

SpecHeal adalah MVP hackathon untuk Engineering Productivity x AI. Produk harus berjalan end-to-end: judge membuka dashboard, menjalankan scenario ShopFlow Checkout, melihat live OpenAI verdict, melihat OpenSpec sebagai guardrail, melihat proof dari browser/rerun, dan melihat Jira issue yang dibuat otomatis.

Constraints utama:

- Live OpenAI adalah core MVP, bukan optional.
- Semua terminal run harus mencoba publish ke Jira.
- OpenSpec menjadi source of truth behavior.
- PostgreSQL menyimpan run dan artifact audit.
- Runtime product harus bisa dideploy ke Kubernetes di VPS hackathon.
- Demo utama harus tetap sempit: Healthy Flow, Locator Drift, dan Product Bug.

## Goals / Non-Goals

**Goals:**

- Menyediakan vertical slice yang bisa dinilai end-to-end dari dashboard sampai Jira.
- Memisahkan product behavior ShopFlow dari recovery behavior SpecHeal.
- Menggunakan OpenAI structured verdict untuk failed test recovery.
- Membuktikan `HEAL` melalui candidate validation dan rerun proof.
- Mempublikasikan semua terminal run ke Jira secara otomatis.
- Menyimpan report lengkap di PostgreSQL agar run dapat diaudit ulang.
- Menyediakan deployment path untuk Kubernetes.

**Non-Goals:**

- Menguji website arbitrary.
- Auto-commit, auto-merge, atau membuat GitHub PR.
- Authentication atau multi-tenant workspace.
- Live screenshot attachment ke Jira.
- Scenario demo utama untuk `SPEC OUTDATED`.
- Support framework selain Playwright.

## Decisions

### Decision 1: Gunakan seeded ShopFlow Checkout sebagai system under test

Rationale:

- Checkout flow mudah dipahami judge.
- Payment action adalah critical UI behavior yang jelas.
- Locator drift dan product bug bisa dibedakan dengan visual evidence dan OpenSpec.

Alternatives considered:

- Arbitrary website testing: terlalu luas untuk MVP dan sulit dibuat deterministic.
- Login flow: mudah dipahami, tetapi payment completion lebih kuat untuk memperlihatkan product regression.

### Decision 2: Pisahkan capability OpenSpec menjadi ShopFlow, SpecHeal Recovery, dan Jira Integration

Rationale:

- ShopFlow spec harus behavior-first dan selector-agnostic.
- SpecHeal recovery spec mengatur pipeline recovery, AI, validation, rerun, persistence, dan deployment readiness.
- Jira integration spec mengatur auto-publish semua terminal run, mapping issue, failure handling, dan retry.

Alternatives considered:

- Satu spec besar: lebih cepat ditulis, tetapi sulit dipakai sebagai guardrail yang rapi.
- Spec Jira digabung ke recovery: bisa dilakukan, tetapi requirement publish semua run cukup penting untuk dipisahkan.

### Decision 3: Live OpenAI wajib untuk failed recovery analysis

Rationale:

- OpenAI adalah inti inovasi demo.
- Judge perlu melihat bahwa verdict dihasilkan oleh live AI call dengan prompt dan response yang bisa diaudit.
- Confidence harus diperlakukan sebagai AI confidence, bukan kepastian matematis.

Alternatives considered:

- Deterministic fallback sebagai demo path: ditolak untuk MVP karena melemahkan klaim AI.

Design consequence:

- Jika OpenAI gagal, run masuk terminal failure state dan tetap harus mencoba publish Jira issue sebagai operational failure jika memungkinkan.
- Sistem tidak boleh diam-diam mengganti live OpenAI dengan seeded verdict saat demo.

### Decision 4: HEAL harus melewati validation dan rerun proof

Rationale:

- OpenAI hanya memberi candidate dan reason.
- Browser validation memastikan candidate ada, unik, visible, enabled, dan click-able.
- Rerun memastikan flow benar-benar mencapai `Payment Success`.

Alternatives considered:

- Tampilkan patch langsung dari AI: ditolak karena berisiko false green.

Design consequence:

- Patch preview hanya boleh disebut safe setelah validation dan rerun passed.
- Jika validation/rerun gagal karena behavior tidak terpenuhi, final output tidak boleh menjadi safe heal.

### Decision 5: Jira auto-publish berjalan setelah setiap terminal run

Rationale:

- MVP harus membuktikan workflow output, bukan hanya report preview.
- Semua status run harus masuk workflow Jira: pass/audit, heal task, product bug, spec outdated task, dan operational run error.

Issue mapping:

| Terminal Result | Jira Issue Type | Purpose |
| --- | --- | --- |
| `NO_HEAL_NEEDED` | Task | Audit bahwa scenario berjalan sehat |
| `HEAL` | Task | Review dan apply patch locator |
| `PRODUCT BUG` | Bug | Perbaiki product regression |
| `SPEC OUTDATED` | Task | Update test/spec mapping |
| `RUN_ERROR` atau operational failure | Task | Investigasi kegagalan runtime SpecHeal |

Design consequence:

- Jika Jira publish gagal, run tetap disimpan dengan `jira_publish_failed`.
- Sistem menyediakan retry publish karena issue tidak mungkin dibuat ketika Jira/API/credential sedang gagal.

### Decision 6: Gunakan PostgreSQL sebagai report store

Rationale:

- Run history dan full report perlu survive page reload.
- PostgreSQL memenuhi requirement hackathon.
- Report perlu menyimpan structured artifact, bukan hanya text log.

Data groups:

- run metadata,
- failure evidence,
- AI trace,
- validation result,
- rerun result,
- patch preview,
- Jira publish result.

### Decision 7: MVP deployment memakai Kubernetes dengan app container yang memuat dashboard, API, dan worker runtime

Rationale:

- Untuk hackathon, satu deployable app container lebih cepat dan lebih mudah dioperasikan.
- Playwright worker dapat berjalan in-process/background job untuk seeded demo.
- Arsitektur tetap bisa di-split menjadi worker service pasca-MVP.

Alternatives considered:

- Separate queue/worker service: lebih scalable, tetapi menambah deployment complexity.

Design consequence:

- Container image harus membawa browser dependencies.
- Kubernetes Secret harus menyimpan OpenAI, Jira, database, dan runtime config.
- PostgreSQL harus reachable dari app container.

## Risks / Trade-offs

- OpenAI API gagal atau rate limited -> tampilkan failure state, simpan error, dan publish Jira operational issue jika Jira tersedia.
- Jira API gagal -> simpan `jira_publish_failed`, tampilkan error jujur, sediakan retry.
- Jira issue type berbeda antar project -> issue type harus configurable melalui environment variable.
- Playwright dependency berat di container -> gunakan base image atau install dependency browser yang sesuai.
- AI verdict salah -> wajib browser validation, rerun proof, dan trace audit.
- OpenSpec terlalu implementation-specific -> ShopFlow spec harus melarang selector detail dan tetap behavior-first.
- Scope melebar -> demo utama tetap Locator Drift dan Product Bug.

## Migration Plan

Karena ini initial MVP, tidak ada migrasi data lama.

Implementasi disarankan bertahap:

1. Buat struktur app, environment, dan PostgreSQL schema.
2. Buat ShopFlow Checkout dan scenario states.
3. Buat Playwright runtime dan evidence capture.
4. Buat OpenSpec loader dan prompt builder.
5. Integrasikan live OpenAI structured verdict.
6. Tambahkan validation dan rerun proof.
7. Tambahkan Jira auto-publish semua terminal run.
8. Bangun dashboard timeline, trace, dan full report.
9. Siapkan Docker/Kubernetes deployment.

Rollback:

- Jika deploy app gagal, rollback Kubernetes Deployment ke image sebelumnya.
- Jika Jira publish gagal, report tetap tersimpan dan publish dapat di-retry setelah konfigurasi diperbaiki.

## Open Questions

- Jira project key final apa?
- Nama issue type final untuk Task dan Bug apa?
- Model OpenAI final yang dipakai demo apa?
- Domain/Ingress dari VPS Kubernetes seperti apa?
- Screenshot evidence MVP disimpan sebagai base64 di PostgreSQL atau sebagai file reference?
