## Context

SpecHeal adalah MVP hackathon untuk Engineering Productivity x AI. Produk harus berjalan end-to-end: judge membuka dashboard, menjalankan scenario ShopFlow Checkout, melihat live OpenAI verdict, melihat OpenSpec sebagai guardrail, melihat proof dari browser/rerun, melihat persisted audit report, dan melihat Jira issue untuk hasil yang membutuhkan tindak lanjut.

Constraints utama:

- Live OpenAI adalah core MVP, bukan optional.
- Model OpenAI MVP adalah `gpt-4o-mini`, dengan konfigurasi server-side dan trace yang bisa diaudit.
- Jira wajib untuk actionable terminal results: `HEAL`, `PRODUCT BUG`, `SPEC OUTDATED`, dan operational run error. `NO_HEAL_NEEDED` menjadi persisted audit report tanpa Jira issue secara default.
- Jira target MVP memakai Jira Cloud REST API pada project key `SH`, dengan credential hanya melalui environment/Kubernetes Secret.
- OpenSpec menjadi source of truth behavior.
- PostgreSQL menyimpan run dan artifact audit, termasuk screenshot evidence sebagai base64 untuk MVP.
- Runtime product harus bisa dideploy ke Kubernetes di VPS hackathon sebagai satu app container dan PostgreSQL service terpisah.
- Demo utama harus tetap sempit: Healthy Flow, Locator Drift, dan Product Bug.

## Goals / Non-Goals

**Goals:**

- Menyediakan vertical slice yang bisa dinilai end-to-end dari dashboard sampai Jira.
- Memisahkan product behavior ShopFlow dari recovery behavior SpecHeal.
- Menggunakan OpenAI structured verdict untuk failed test recovery.
- Membuktikan `HEAL` melalui candidate validation, controlled test-file patch application, dan rerun proof.
- Mempublikasikan actionable terminal results ke Jira secara otomatis.
- Menyimpan report lengkap di PostgreSQL agar run dapat diaudit ulang.
- Menyediakan deployment path untuk Kubernetes.

**Non-Goals:**

- Menguji website arbitrary.
- Auto-commit, auto-merge, memperbaiki product code secara otomatis, atau membuat GitHub PR.
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
- Jira integration spec mengatur auto-publish actionable terminal results, mapping issue, failure handling, report-only healthy runs, dan retry.

Alternatives considered:

- Satu spec besar: lebih cepat ditulis, tetapi sulit dipakai sebagai guardrail yang rapi.
- Spec Jira digabung ke recovery: bisa dilakukan, tetapi live workflow handoff cukup penting untuk dipisahkan.

### Decision 3: Live OpenAI wajib untuk failed recovery analysis

Rationale:

- OpenAI adalah inti inovasi demo.
- Judge perlu melihat bahwa verdict dihasilkan oleh live AI call dengan prompt dan response yang bisa diaudit.
- Confidence harus diperlakukan sebagai AI confidence, bukan kepastian matematis.

Alternatives considered:

- Deterministic fallback sebagai demo path: ditolak untuk MVP karena melemahkan klaim AI.

Design consequence:

- Jika OpenAI gagal, run masuk terminal failure state dan tetap harus mencoba publish Jira issue sebagai operational failure jika memungkinkan.
- Sistem tidak boleh diam-diam mengganti live OpenAI dengan deterministic atau precomputed verdict saat demo.
- OpenAI call memakai model `gpt-4o-mini` secara default, kecuali environment override eksplisit disediakan.
- Prompt dan response wajib disimpan sebagai trace audit, tetapi API key tidak pernah disimpan ke database atau report.

### Decision 4: HEAL harus melewati validation, test-file patch, dan rerun proof

Rationale:

- OpenAI hanya memberi candidate dan reason.
- Browser validation memastikan candidate ada, unik, visible, enabled, dan click-able.
- Controlled patch application ke Playwright test file membuktikan locator baru benar-benar bisa menjalankan test, bukan hanya selector injection sementara.
- Rerun dari test yang sudah dipatch memastikan flow benar-benar mencapai `Payment Success`.

Alternatives considered:

- Tampilkan patch langsung dari AI: ditolak karena berisiko false green.
- Rerun langsung dengan selector override tanpa mengubah test file: berguna sebagai smoke check, tetapi kurang kuat untuk membuktikan bahwa patch yang direview memang executable.

Design consequence:

- Patch preview hanya boleh disebut safe setelah validation, patch application, dan rerun passed.
- Sistem boleh memodifikasi test file target secara controlled di runtime/workspace MVP, tetapi tidak boleh auto-commit, auto-merge, atau mengubah product implementation code.
- Jika validation/rerun gagal karena behavior tidak terpenuhi, final output tidak boleh menjadi safe heal.

### Decision 5: Jira auto-publish berjalan untuk actionable terminal results

Rationale:

- MVP harus membuktikan workflow output, bukan hanya report preview.
- Jira dipakai untuk tindak lanjut manusia: review patch, fix product regression, update spec/test mapping, atau investigasi operational error.
- Healthy/no-heal run tetap penting sebagai audit trail, tetapi tidak membutuhkan Jira issue secara default.

Issue mapping:

| Terminal Result | Jira Issue Type | Purpose |
| --- | --- | --- |
| `NO_HEAL_NEEDED` | Tidak dibuat secara default | Persisted audit report bahwa scenario berjalan sehat |
| `HEAL` | Task | Review dan apply patch locator |
| `PRODUCT BUG` | Bug | Perbaiki product regression |
| `SPEC OUTDATED` | Task | Update test/spec mapping |
| `RUN_ERROR` atau operational failure | Task | Investigasi kegagalan runtime SpecHeal |

Design consequence:

- Jika Jira publish gagal untuk actionable result, run tetap disimpan dengan `jira_publish_failed`.
- Sistem menyediakan retry publish karena issue tidak mungkin dibuat ketika Jira/API/credential sedang gagal.

### Decision 6: Gunakan PostgreSQL sebagai report store

Rationale:

- Run history dan full report perlu survive page reload.
- PostgreSQL memenuhi requirement hackathon.
- Report perlu menyimpan structured artifact, bukan hanya text log.

Data groups:

- run metadata,
- failure evidence,
- screenshot base64,
- AI trace,
- validation result,
- rerun result,
- applied patch preview,
- Jira publish result.

### Decision 7: MVP deployment memakai Kubernetes dengan app container yang memuat dashboard, API, dan in-process runner

Rationale:

- Untuk hackathon, satu deployable app container lebih cepat dan lebih mudah dioperasikan.
- Playwright worker dapat berjalan in-process/background job untuk seeded demo.
- Arsitektur tetap bisa di-split menjadi worker service pasca-MVP.

Alternatives considered:

- Separate queue/worker service: lebih scalable, tetapi menambah deployment complexity.

Design consequence:

- Container image harus membawa dashboard, API routes/backend, in-process Playwright runner, OpenAI client, Jira publisher, dan browser dependencies.
- Kubernetes Secret harus menyimpan OpenAI, Jira, database, dan runtime config.
- PostgreSQL berjalan sebagai service/deployment terpisah atau external database yang reachable dari app container.

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
5. Integrasikan live OpenAI structured verdict dengan model `gpt-4o-mini`.
6. Tambahkan validation, controlled test-file patch application, dan rerun proof.
7. Tambahkan Jira auto-publish untuk actionable terminal results dan report-only behavior untuk healthy runs.
8. Bangun dashboard timeline, trace, dan full report.
9. Siapkan Docker/Kubernetes deployment.

Rollback:

- Jika deploy app gagal, rollback Kubernetes Deployment ke image sebelumnya.
- Jika Jira publish gagal, report tetap tersimpan dan publish dapat di-retry setelah konfigurasi diperbaiki.

## Open Questions

- Domain/Ingress dari VPS Kubernetes seperti apa?
- Jira permission dan issue type `Task`/`Bug` perlu divalidasi dengan API setelah credential aman dan di-rotate jika pernah terpapar.
