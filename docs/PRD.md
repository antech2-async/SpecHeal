# Product Requirements Document: SpecHeal

Status: Draft planning  
Tim: Merge Kalau Berani  
Event: Refactory Hackathon 2026, Telkom Round  
Tanggal: 12 Mei 2026  
Target pembaca: judge, mentor, developer, dan stakeholder hackathon

## 1. Executive Summary

SpecHeal adalah recovery cockpit berbasis AI untuk membantu tim engineering menangani kegagalan UI automation test, dengan fokus MVP pada Playwright.

Ketika test gagal, SpecHeal menjawab satu pertanyaan penting:

> Apakah test ini aman diperbaiki, atau produk benar-benar rusak?

SpecHeal menjalankan test di browser, mengambil evidence kegagalan, membaca OpenSpec sebagai kontrak perilaku, meminta OpenAI menghasilkan verdict terstruktur, memvalidasi candidate selector di browser, membuktikan hasil dengan rerun, menyimpan report ke PostgreSQL, lalu mempublikasikan action ke Jira.

Core thesis:

> SpecHeal bukan sekadar membuat test hijau. SpecHeal membuat recovery test bisa dipercaya.

## 2. Product Positioning

Kategori produk:

```text
AI-assisted UI test recovery cockpit
```

SpecHeal berada di antara test automation, CI failure triage, AI developer productivity, dan QA workflow automation.

SpecHeal bukan:

- pengganti Playwright,
- generic QA chatbot,
- generic website crawler,
- Jira ticket generator biasa,
- tool yang otomatis membuat semua test gagal menjadi pass.

Pembeda utama:

```text
AI proposes. OpenSpec guards. Browser validates. Jira tracks.
```

## 3. Hackathon Context

Refactory Hackathon 2026 mengangkat tema Engineering Productivity x AI. Produk yang dibangun harus berupa solusi nyata yang bekerja end-to-end.

Untuk SpecHeal, engineering productivity berarti:

- mengurangi waktu investigasi test failure,
- mengubah CI failure menjadi keputusan yang jelas,
- menjaga trust terhadap regression suite,
- mencegah false green dari self-healing yang terlalu agresif.

Kebutuhan utama hackathon yang dipenuhi SpecHeal:

- AI/LLM dipakai sebagai core verdict engine melalui OpenAI.
- OpenSpec dipakai sebagai source of truth requirement.
- PostgreSQL dipakai untuk menyimpan run dan artifact.
- Jira dipakai sebagai workflow output.
- Semua runtime artifact dideploy ke Kubernetes di VPS.
- Judge dapat menggunakan produk melalui dashboard, bukan hanya menonton slide.

## 4. Problem Statement

Automation testing membantu tim software mendapatkan feedback cepat. Namun pada UI automation, test failure sering tidak langsung berarti product bug.

UI test sering bergantung pada detail implementasi:

- selector,
- id HTML,
- atribut test,
- struktur DOM,
- teks tombol,
- posisi elemen.

Ketika UI berubah, test bisa gagal walaupun behavior produk tetap benar.

Contoh:

```ts
await page.click("#pay-now");
```

Tombol payment tetap ada, tetapi selector berubah:

```html
<button data-testid="complete-payment">Pay Now</button>
```

Dari sisi user, checkout masih bisa berhasil. Dari sisi CI, pipeline tetap merah.

Masalah yang lebih berbahaya adalah false green. Jika AI asal memilih selector baru agar test pass, test bisa hijau meskipun requirement produk sebenarnya dilanggar.

SpecHeal menyelesaikan problem ini dengan safe recovery loop:

```text
Playwright failure
-> evidence capture
-> OpenSpec requirement
-> OpenAI verdict
-> browser validation
-> rerun proof
-> Jira action
```

## 5. Goals

### 5.1 Product Goals

1. Menyediakan dashboard untuk menjalankan scenario recovery UI test.
2. Menggunakan live OpenAI untuk menganalisis failure evidence dan OpenSpec.
3. Membedakan `HEAL`, `PRODUCT BUG`, `SPEC OUTDATED`, dan `NO_HEAL_NEEDED`.
4. Membuktikan `HEAL` melalui browser validation dan rerun proof.
5. Membuat Jira issue secara live untuk hasil recovery yang membutuhkan action.
6. Menyimpan run history dan audit trail ke PostgreSQL.
7. Menyediakan full report yang bisa diaudit oleh judge, mentor, dan developer.
8. Menyediakan deployment Kubernetes untuk seluruh runtime MVP.

### 5.2 Demo Goals

Demo harus membuktikan:

- Locator drift dapat di-heal secara aman.
- Product bug tidak boleh dipaksa menjadi test hijau.
- OpenAI benar-benar dipakai untuk verdict.
- OpenSpec benar-benar dipakai sebagai guardrail.
- Jira benar-benar menerima issue hasil recovery.
- Produk berjalan end-to-end dari dashboard sampai report.

### 5.3 Business/Impact Goals

SpecHeal harus menunjukkan nilai engineering productivity:

- mengurangi investigasi manual,
- mempercepat keputusan setelah CI failure,
- menjaga confidence terhadap automated test,
- membuat output langsung actionable di Jira.

## 6. Non-Goals

Untuk MVP hackathon, SpecHeal tidak menargetkan:

- testing website arbitrary,
- auto-commit atau auto-merge patch,
- GitHub PR automation,
- authentication dan multi-tenant workspace,
- support Cypress/Selenium,
- analytics historis skala besar,
- enterprise policy engine,
- live attachment screenshot ke Jira,
- demo utama untuk `SPEC OUTDATED`.

`SPEC OUTDATED` tetap didukung dalam verdict/schema, tetapi bukan alur demo utama kecuali core MVP selesai lebih awal.

## 7. Target Users

### 7.1 Judge Hackathon

Kebutuhan:

- melihat produk yang benar-benar berjalan,
- memahami problem dengan cepat,
- melihat AI dipakai dengan guardrail,
- melihat output nyata ke Jira,
- menilai end-to-end execution.

Success signal:

- judge dapat menjalankan scenario dan melihat hasil lengkap tanpa terminal.

### 7.2 Mentor

Kebutuhan:

- memahami scope MVP,
- menilai risiko teknis,
- melihat arsitektur dan tradeoff,
- memberi masukan terhadap implementasi.

Success signal:

- mentor dapat membaca PRD, C4, dan OpenSpec lalu memahami keputusan scope.

### 7.3 QA Engineer

Kebutuhan:

- tahu apakah test failure aman diperbaiki,
- melihat evidence tanpa inspect manual terlalu lama,
- mendapatkan patch atau bug report yang bisa ditindaklanjuti.

Success signal:

- QA engineer dapat membedakan maintenance test dari product regression.

### 7.4 Frontend Engineer

Kebutuhan:

- tahu apakah UI refactor merusak behavior atau hanya selector test,
- mendapatkan patch test yang jelas,
- menerima Jira issue yang punya evidence.

Success signal:

- frontend engineer dapat memperbaiki test atau produk berdasarkan report.

### 7.5 Engineering Lead

Kebutuhan:

- menjaga trust terhadap CI,
- menghindari false green,
- memastikan failure menghasilkan action yang jelas.

Success signal:

- lead dapat melihat audit trail dan Jira output dari setiap recovery run.

## 8. MVP Scope

### 8.1 In Scope

MVP mencakup:

- Dashboard SpecHeal.
- Seeded demo app: ShopFlow Checkout.
- Scenario picker: Healthy Flow, Locator Drift, Product Bug.
- Runtime Playwright execution.
- Failure evidence capture.
- DOM cleaning dan sensitive data masking.
- Candidate selector extraction.
- OpenSpec requirement loading.
- Live OpenAI verdict.
- Browser candidate validation.
- Rerun proof.
- Patch preview untuk `HEAL`.
- Jira issue publishing untuk `HEAL` dan `PRODUCT BUG`.
- PostgreSQL persistence.
- Recent runs dan full report.
- Kubernetes deployment.

### 8.2 Out of Scope

Out of scope sudah dijelaskan di bagian Non-Goals. Fitur out of scope tidak boleh menjadi blocker untuk demo utama.

## 9. Demo Product: ShopFlow Checkout

ShopFlow Checkout adalah mini checkout app yang menjadi system under test.

Flow user:

```text
cart -> checkout -> pay -> Payment Success
```

Alasan memilih checkout:

- mudah dipahami non-technical audience,
- behavior sukses jelas,
- payment action adalah critical flow,
- cocok untuk membedakan locator drift dari product bug,
- requirement OpenSpec dapat ditulis secara spesifik.

## 10. Supported Verdicts

### 10.1 NO_HEAL_NEEDED

Makna:

- test berjalan sukses dengan selector saat ini,
- tidak ada failure yang perlu di-recover.

Output:

- report sukses,
- tidak wajib membuat Jira issue.

### 10.2 HEAL

Makna:

- test gagal karena locator/DOM drift,
- behavior produk tetap sesuai OpenSpec,
- candidate selector baru valid,
- rerun berhasil mencapai expected result.

Output:

- patch preview,
- validation proof,
- rerun proof,
- Jira Task untuk review/apply patch.

### 10.3 PRODUCT BUG

Makna:

- behavior yang diwajibkan OpenSpec hilang atau rusak,
- tidak ada valid recovery yang aman,
- test tidak boleh dipaksa hijau.

Output:

- Jira Bug,
- evidence failure,
- no patch as safe heal.

### 10.4 SPEC OUTDATED

Makna:

- test lama tidak sesuai dengan flow/requirement terbaru,
- perbaikan tidak cukup dengan mengganti selector,
- action yang benar adalah update test atau mapping test terhadap OpenSpec.

Output:

- Jira Task untuk update test/spec mapping.

Catatan:

- `SPEC OUTDATED` didukung dalam desain dan schema.
- Demo utama MVP fokus pada `HEAL` dan `PRODUCT BUG`.

## 11. User Journeys

### 11.1 Journey: Judge menjalankan Locator Drift

1. Judge membuka dashboard SpecHeal.
2. Judge memilih scenario Locator Drift.
3. Judge klik Run.
4. SpecHeal menjalankan Playwright test terhadap ShopFlow.
5. Test gagal karena selector lama tidak ditemukan.
6. SpecHeal mengambil screenshot, DOM, visible text, error, dan candidate list.
7. SpecHeal membaca OpenSpec checkout requirement.
8. SpecHeal memanggil OpenAI untuk verdict.
9. OpenAI mengembalikan verdict `HEAL` dengan candidate selector.
10. SpecHeal memvalidasi candidate selector di browser.
11. SpecHeal melakukan rerun dengan selector baru.
12. Rerun mencapai `Payment Success`.
13. Dashboard menampilkan patch preview.
14. SpecHeal membuat Jira Task.
15. Dashboard menampilkan Jira issue key dan link.

### 11.2 Journey: Judge menjalankan Product Bug

1. Judge membuka dashboard SpecHeal.
2. Judge memilih scenario Product Bug.
3. Judge klik Run.
4. SpecHeal menjalankan Playwright test terhadap ShopFlow.
5. Test gagal karena payment action tidak tersedia.
6. SpecHeal mengambil evidence.
7. SpecHeal membaca OpenSpec yang mewajibkan payment action.
8. SpecHeal memanggil OpenAI untuk verdict.
9. OpenAI mengembalikan verdict `PRODUCT BUG`.
10. SpecHeal tidak membuat patch.
11. SpecHeal membuat Jira Bug.
12. Dashboard menampilkan issue key, link, dan evidence summary.

### 11.3 Journey: Developer membuka Full Report

1. Developer memilih recent run.
2. Developer membuka full report.
3. Developer melihat timeline.
4. Developer membuka AI trace.
5. Developer membaca OpenSpec clause.
6. Developer melihat validation/rerun proof atau bug evidence.
7. Developer membuka Jira issue untuk action lanjutan.

## 12. Functional Requirements

### FR-001 Dashboard Active Project

SpecHeal harus menampilkan dashboard utama untuk project ShopFlow Checkout.

Acceptance criteria:

- Menampilkan nama project.
- Menampilkan status OpenSpec.
- Menampilkan status Playwright suite.
- Menampilkan status Jira configuration.
- Menampilkan status OpenAI configuration.
- Menyediakan CTA run scenario.

### FR-002 Scenario Picker

Dashboard harus menyediakan scenario picker untuk:

- Healthy Flow,
- Locator Drift,
- Product Bug.

Acceptance criteria:

- User dapat memilih scenario.
- Scenario terpilih terlihat jelas.
- Scenario menentukan target state ShopFlow.
- CTA menjalankan scenario terpilih.

### FR-003 Runtime Test Execution

SpecHeal harus menjalankan Playwright test saat user memulai run.

Acceptance criteria:

- Playwright membuka target ShopFlow.
- Playwright menjalankan action dengan selector awal.
- Playwright menunggu expected result `Payment Success`.
- Result menyimpan status pass/fail, selector, target URL, test name, step name, error, dan duration.

### FR-004 Failure Evidence Capture

Jika Playwright test gagal, SpecHeal harus mengambil evidence.

Acceptance criteria:

- Evidence mencakup error message.
- Evidence mencakup screenshot.
- Evidence mencakup failed selector.
- Evidence mencakup target URL.
- Evidence mencakup raw DOM length.
- Evidence mencakup cleaned DOM.
- Evidence mencakup visible page evidence.
- Evidence mencakup ranked candidate list.

### FR-005 DOM Cleaning and Masking

SpecHeal harus membersihkan DOM sebelum dikirim ke OpenAI.

Acceptance criteria:

- Menghapus noise seperti `head`, `script`, `style`, `meta`, `link`, `noscript`, comments, SVG, iframe, canvas, dan template.
- Memasking email dan sensitive input values.
- Menyimpan raw DOM length dan cleaned DOM length.
- Menggunakan cleaned DOM sebagai evidence utama untuk prompt.

### FR-006 Candidate Extraction

SpecHeal harus mengekstrak candidate element yang relevan untuk recovery.

Acceptance criteria:

- Candidate diambil dari body, bukan head metadata.
- Candidate click harus visible.
- Candidate click harus enabled.
- Candidate click harus interaktif atau punya stable locator.
- Candidate diberi score/ranking.
- Zero-candidate state harus eksplisit di report.

### FR-007 OpenSpec Guardrail

SpecHeal harus memakai OpenSpec sebagai source of truth.

Acceptance criteria:

- Prompt OpenAI menyertakan OpenSpec clause yang relevan.
- OpenSpec ShopFlow mendeskripsikan behavior, bukan selector implementasi.
- `HEAL` hanya valid jika behavior tetap memenuhi OpenSpec.
- `PRODUCT BUG` digunakan ketika behavior wajib tidak tersedia.
- OpenSpec clause ditampilkan di report.

### FR-008 Live OpenAI Verdict

SpecHeal harus memakai live OpenAI untuk menghasilkan verdict.

Acceptance criteria:

- OpenAI API dipanggil ketika failed run butuh recovery analysis.
- Model dikonfigurasi via environment variable.
- Response harus structured dan parseable.
- Verdict mendukung `HEAL`, `PRODUCT BUG`, dan `SPEC OUTDATED`.
- Response menyertakan reason, confidence, candidate selector, patch atau bug report.
- Dashboard menampilkan model, prompt, raw response, parsed response, token usage, dan estimated cost jika tersedia.
- Jika OpenAI gagal, run menampilkan failure state yang jujur dan dapat di-retry.

### FR-009 Candidate Validation

Jika verdict `HEAL`, SpecHeal harus memvalidasi candidate selector di browser.

Acceptance criteria:

- Candidate selector match tepat satu elemen.
- Elemen visible.
- Elemen enabled.
- Elemen bisa menerima click trial.
- Validation result tersimpan di report.
- Patch tidak boleh dianggap safe jika validation gagal.

### FR-010 Rerun Proof

Jika candidate validation berhasil, SpecHeal harus melakukan rerun.

Acceptance criteria:

- Rerun memakai candidate selector.
- Rerun memakai target scenario yang sama.
- Rerun mencapai `Payment Success`.
- Patch hanya ditandai safe jika rerun passed.

### FR-011 Patch Preview

Untuk verdict `HEAL`, SpecHeal harus menampilkan patch preview.

Acceptance criteria:

- Patch mencakup target file.
- Patch mencakup old line.
- Patch mencakup new line.
- Patch mencakup explanation.
- Patch tidak auto-commit dan tidak auto-merge.

### FR-012 Jira Publishing

SpecHeal harus membuat Jira issue secara live untuk recovery result yang membutuhkan action.

Acceptance criteria:

- Membaca Jira credential dari server-side environment.
- Membuat Jira Task untuk `HEAL`.
- Membuat Jira Bug untuk `PRODUCT BUG`.
- Membuat Jira Task untuk `SPEC OUTDATED` jika terjadi.
- Jira payload berisi summary, description, issue type, labels, AI verdict, evidence, OpenSpec reference, dan proof.
- Dashboard menampilkan publish status.
- Dashboard menampilkan issue key dan issue URL jika berhasil.
- Error Jira ditampilkan jujur jika publish gagal.
- Run tetap tersimpan meskipun Jira publish gagal.

Placeholder konfigurasi:

```env
JIRA_SITE_URL=https://<team>.atlassian.net
JIRA_EMAIL=<email>
JIRA_API_TOKEN=<token>
JIRA_PROJECT_KEY=<project-key>
JIRA_TASK_ISSUE_TYPE=Task
JIRA_BUG_ISSUE_TYPE=Bug
```

### FR-013 PostgreSQL Persistence

SpecHeal harus menyimpan run dan artifact penting ke PostgreSQL.

Acceptance criteria:

- Menyimpan run metadata.
- Menyimpan verdict dan reason.
- Menyimpan AI trace.
- Menyimpan evidence summary.
- Menyimpan patch preview.
- Menyimpan validation dan rerun result.
- Menyimpan Jira publish result.
- Menyediakan recent runs.
- Menyediakan full report by run ID.

### FR-014 Report Timeline

Dashboard harus menampilkan run sebagai timeline.

Acceptance criteria:

Timeline minimal berisi:

1. Playwright test result.
2. Failure evidence.
3. OpenSpec clause.
4. OpenAI verdict.
5. Healing proof atau bug decision.
6. Jira publish result.

### FR-015 Full Report

SpecHeal harus menyediakan halaman full report untuk setiap run.

Acceptance criteria:

- Full report dapat dibuka dari dashboard.
- Full report menampilkan run overview.
- Full report menampilkan evidence screenshot jika ada.
- Full report menampilkan OpenSpec clause.
- Full report menampilkan AI trace.
- Full report menampilkan validation/rerun proof.
- Full report menampilkan Jira issue result.

### FR-016 Kubernetes Deployment

Semua runtime MVP harus dapat dideploy ke Kubernetes di VPS.

Acceptance criteria:

- App tersedia sebagai container image.
- Playwright dependencies tersedia di runtime.
- PostgreSQL tersedia dan dapat diakses dari app.
- Secret digunakan untuk OpenAI, Jira, dan database.
- Service/Ingress membuka dashboard.
- Deployment dapat direstart tanpa kehilangan konfigurasi.

## 13. Integration Requirements

### 13.1 OpenAI

OpenAI adalah core innovation path.

Prompt harus menyertakan:

- test name,
- step name,
- failed selector,
- Playwright error,
- visible evidence,
- ranked candidates,
- OpenSpec clause,
- expected output schema.

Response minimal:

- verdict,
- reason,
- confidence,
- candidate selector,
- patch preview jika `HEAL`,
- bug/task report jika bukan `HEAL`.

### 13.2 Jira

Jira digunakan sebagai workflow output.

API:

```text
POST /rest/api/3/issue
```

Auth:

```text
Atlassian email + API token
```

Description format:

```text
Atlassian Document Format
```

Issue mapping:

| Verdict | Issue Type | Action |
| --- | --- | --- |
| `HEAL` | Task | Review patch locator |
| `PRODUCT BUG` | Bug | Fix product regression |
| `SPEC OUTDATED` | Task | Update test/spec mapping |
| `NO_HEAL_NEEDED` | Tidak wajib | No action |

### 13.3 PostgreSQL

PostgreSQL menyimpan:

- run history,
- AI trace,
- evidence,
- patch preview,
- validation result,
- rerun result,
- Jira publish result.

### 13.4 Kubernetes

Kubernetes menjadi target deployment semua runtime component:

- dashboard/API app,
- Playwright runtime,
- PostgreSQL,
- service/ingress,
- secrets.

## 14. Data Model Konseptual

### 14.1 Run

- `id`
- `projectId`
- `scenarioId`
- `status`
- `verdict`
- `reason`
- `confidence`
- `createdAt`
- `updatedAt`

### 14.2 Evidence

- `error`
- `screenshot`
- `failedSelector`
- `targetUrl`
- `rawDomLength`
- `cleanedDomLength`
- `cleanedDom`
- `visibleEvidence`
- `candidates`

### 14.3 AI Trace

- `mode`
- `model`
- `systemPrompt`
- `userPrompt`
- `rawResponse`
- `parsedResponse`
- `usage`
- `estimatedCost`
- `durationMs`

### 14.4 Validation Result

- `selector`
- `passed`
- `elementCount`
- `reason`

### 14.5 Jira Publish Result

- `status`
- `issueKey`
- `issueUrl`
- `issueId`
- `payloadSummary`
- `error`
- `createdAt`

## 15. UX Requirements

SpecHeal harus terasa seperti cockpit kerja engineering.

Prinsip:

- first screen langsung menunjukkan produk, project, dan action,
- bukan landing page marketing,
- bukan chatbot,
- bukan form kosong,
- scenario picker mudah dipahami,
- verdict sangat jelas,
- evidence ringkas di permukaan,
- detail audit tersedia di drawer/full report,
- OpenSpec tampil sebagai locked source of truth,
- Jira status tampil sebagai final workflow step.

Primary layout:

- top bar: brand, project, selected scenario, status/verdict,
- control panel: scenario picker dan run CTA,
- report panel: timeline run,
- evidence panel: screenshot, patch, Jira status,
- trace drawer: prompt, raw output, validation details,
- full report page: audit lengkap.

## 16. Non-Functional Requirements

### 16.1 Reliability

- Failed OpenAI call tidak boleh membuat UI blank.
- Failed Jira publish tidak boleh menghapus report.
- Run status harus jelas: pending, running, completed, failed.

### 16.2 Security

- OpenAI key, Jira token, dan database URL hanya tersedia server-side.
- Secret disimpan sebagai environment/Kubernetes Secret.
- Token tidak boleh muncul di log client.
- DOM evidence harus masking sensitive values.

### 16.3 Observability

- Run menyimpan timestamps.
- Error state disimpan dan ditampilkan.
- AI duration, token usage, dan estimated cost ditampilkan jika tersedia.

### 16.4 Performance

- Dashboard initial load harus ringan.
- Polling run status harus cukup cepat untuk demo.
- Long-running Playwright/OpenAI/Jira operation harus punya loading state.

### 16.5 Usability

- Judge dapat menjalankan demo tanpa membaca instruksi panjang.
- Developer dapat membuka full report untuk audit teknis.
- Mentor dapat melihat end-to-end architecture dari behavior produk.

## 17. Success Metrics

MVP dianggap berhasil jika:

1. Dashboard dapat dibuka dari deployment Kubernetes.
2. Locator Drift scenario berjalan end-to-end.
3. Product Bug scenario berjalan end-to-end.
4. OpenAI benar-benar dipanggil pada failed run.
5. OpenSpec clause terlihat di prompt/report.
6. `HEAL` menghasilkan validation proof dan rerun proof.
7. `PRODUCT BUG` tidak menghasilkan safe patch.
8. Jira Task berhasil dibuat untuk `HEAL`.
9. Jira Bug berhasil dibuat untuk `PRODUCT BUG`.
10. PostgreSQL menyimpan run history.
11. Full report dapat dibuka.
12. Error state OpenAI/Jira ditangani dengan jujur.

## 18. Release Criteria

MVP siap demo jika:

- semua environment variable wajib tersedia,
- dashboard dapat diakses publik/oleh judge,
- OpenAI call berhasil minimal pada Locator Drift dan Product Bug,
- Jira issue berhasil dibuat dari dashboard,
- PostgreSQL menyimpan run,
- Kubernetes deployment stabil,
- demo script dapat dilakukan dalam 5 menit.

## 19. Demo Script

Opening:

```text
Automation testing mempercepat regression testing, tapi UI test failure tidak selalu berarti produk rusak. Kalau AI self-healing asal membuat test pass, kita bisa mendapat false green: test hijau, requirement produk dilanggar.
```

Locator Drift:

```text
Di skenario ini selector gagal, tapi payment behavior masih sesuai OpenSpec. SpecHeal meminta OpenAI memberi verdict, memvalidasi candidate di browser, melakukan rerun, lalu membuat Jira Task untuk review patch.
```

Product Bug:

```text
Di skenario ini payment action benar-benar tidak tersedia. Karena OpenSpec mewajibkan payment completion, SpecHeal tidak membuat patch. Output yang benar adalah Jira Bug.
```

Closing:

```text
SpecHeal bukan sekadar self-healing. SpecHeal adalah safe recovery layer: AI proposes, OpenSpec guards, Browser validates, Jira tracks.
```

## 20. Risks and Mitigations

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| OpenAI API gagal | Verdict tidak tersedia | Tampilkan error jujur, siapkan retry, pastikan key valid |
| Jira credential belum siap | Issue tidak terbuat | Gunakan placeholder, buat config health check, validasi project key |
| Jira issue type berbeda | API create issue gagal | Gunakan minimal fields dan configurable issue type |
| Playwright sulit jalan di container | Demo gagal | Pakai container base image dengan browser dependencies |
| Scope melebar | MVP tidak selesai | Fokus pada Locator Drift dan Product Bug |
| AI verdict salah | Rekomendasi keliru | Wajib validation, rerun proof, dan trace |
| OpenSpec tidak jelas | Guardrail lemah | Tulis OpenSpec behavior-first dan selector-agnostic |

## 21. Dependencies and Assumptions

Dependencies:

- OpenAI API key.
- Jira Cloud site.
- Jira project key.
- Jira API token.
- PostgreSQL.
- Kubernetes VPS dari penyelenggara.
- Network egress dari cluster ke OpenAI dan Atlassian.

Assumptions:

- Jira project punya issue type `Task` dan `Bug`, atau nama issue type dapat dikonfigurasi.
- Judge dapat mengakses dashboard via URL deployment.
- Demo memakai seeded scenario agar run deterministic dan mudah dinilai.
- OpenSpec ditulis cukup eksplisit untuk membedakan safe heal dan product bug.

## 22. Open Questions

- Jira project key final apa?
- Jira issue type final apa?
- Model OpenAI final apa untuk demo?
- Domain/Ingress Kubernetes dari penyelenggara seperti apa?
- Screenshot evidence disimpan sebagai base64, file, atau object reference?
- Jira issue MVP perlu attachment screenshot, atau cukup evidence summary dan link report?

## 23. Future Roadmap

Setelah MVP:

- demo penuh untuk `SPEC OUTDATED`,
- GitHub PR patch suggestion,
- CI integration untuk membaca failed test run nyata,
- screenshot attachment ke Jira,
- multi-project OpenSpec mapping,
- support Cypress/Selenium,
- trend dashboard untuk selector drift,
- approval policy untuk auto-PR.

## 24. Glossary

| Istilah | Makna |
| --- | --- |
| OpenSpec | Spesifikasi behavior yang menjadi source of truth |
| Playwright | Framework browser automation test |
| Selector drift | Selector test berubah/hilang, tetapi behavior produk masih benar |
| False green | Test pass tetapi behavior produk sebenarnya salah |
| HEAL | Verdict bahwa test aman diperbaiki dengan patch locator |
| PRODUCT BUG | Verdict bahwa produk melanggar requirement |
| SPEC OUTDATED | Verdict bahwa test/spec mapping perlu diperbarui |
| Rerun proof | Bukti test berhasil setelah memakai candidate selector |
| Jira publisher | Komponen yang membuat issue Jira dari report |
