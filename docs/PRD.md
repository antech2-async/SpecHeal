# Product Requirements Document: SpecHeal

Status: Draft  
Tim: Merge Kalau Berani  
Event: Refactory Hackathon 2026, Telkom Round  
Tanggal: 12 Mei 2026  
Target pembaca: QA Engineer, developer, dan stakeholder hackathon

---

## 1. Executive Summary

SpecHeal adalah recovery cockpit berbasis AI untuk membantu tim engineering menangani kegagalan UI automation test, dengan fokus MVP pada Playwright.

Ketika test gagal, SpecHeal menjawab satu pertanyaan penting:

> Apakah test ini aman diperbaiki, atau produk benar-benar rusak?

SpecHeal menjalankan test di browser, mengambil evidence kegagalan, membaca OpenSpec sebagai kontrak perilaku, meminta OpenAI menghasilkan verdict terstruktur, memvalidasi candidate selector di browser, menerapkan patch locator ke test file saat aman, membuktikan hasil dengan rerun, menyimpan report ke PostgreSQL, lalu mempublikasikan hasil yang membutuhkan action ke Jira.

Core thesis:

> SpecHeal bukan sekadar membuat test hijau. SpecHeal membuat recovery test bisa dipercaya.

---

## 2. Product Positioning

Kategori produk:

```
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

```
AI proposes. OpenSpec guards. Browser validates. Jira tracks.
```

---

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
- Produk dapat digunakan langsung melalui dashboard, bukan hanya ditonton lewat slide.

---

## 4. Problem Statement

### 4.1 Automation Testing Sudah Jadi Infrastruktur — Bukan Eksperimen

Hari ini, **77% perusahaan software** sudah mengadopsi automated testing dalam bentuk tertentu, dan market-nya tumbuh menjadi **$29.29 miliar di 2025** dengan CAGR 15.3% [[1]](https://testlio.com/blog/test-automation-statistics/). Perusahaan yang berhasil mengadopsi Agile dengan automation melaporkan produktivitas **30–50% lebih tinggi** dan time-to-market **2–3× lebih cepat** [[2]](https://katalon.com/resources-center/blog/test-automation-statistics-for-2025).

Automation testing bukan lagi fitur opsional — ia adalah tulang punggung engineering workflow modern. Regression suite yang solid memungkinkan tim bergerak cepat tanpa takut merusak production.

### 4.2 Masalah yang Tumbuh Diam-diam: Test Failure yang Tidak Bisa Dipercaya

Namun ada krisis kepercayaan yang sedang berkembang di balik angka adopsi tersebut.

Di Google, **84% CI failure bukan dari product bug**, tapi dari test yang rapuh [[3]](https://slack.engineering/handling-flaky-tests-at-scale-auto-detection-suppression/). Di Slack, sebelum ada remediation khusus, **56.76% CI failure** berasal dari test yang tidak stabil [[3]](https://slack.engineering/handling-flaky-tests-at-scale-auto-detection-suppression/). Atlassian membuang lebih dari **150.000 developer hours per tahun** hanya untuk menangani masalah ini [[4]](https://www.datadoghq.com/knowledge-center/flaky-tests/). Secara industri, **40% waktu QA team** dihabiskan untuk maintenance test — bukan untuk menemukan bug [[4]](https://www.datadoghq.com/knowledge-center/flaky-tests/).

Akibatnya, "CI merah" kehilangan makna. Tim tidak tahu lagi apakah pipeline merah berarti produk rusak atau test yang rusak.

### 4.3 Akar Masalahnya: Locator Drift, Bukan Product Bug

Sumber utama test failure yang tidak relevan ini adalah **locator drift** — kondisi di mana selector test berubah karena UI diupdate, namun behavior produk sebenarnya masih benar.

Setiap sprint dua minggu, diperkirakan **15–25% test suite** gagal karena perubahan locator, bukan karena regresi produk [[5]](https://karatelabs.io/blog/end-of-locator-hell). QA team menghabiskan **sekitar 2 hari per sprint** hanya untuk memperbaiki test yang rusak akibat perubahan ini [[5]](https://karatelabs.io/blog/end-of-locator-hell). Dengan makin cepatnya iterasi UI — dipercepat oleh AI coding assistants — masalah ini disebut sudah **"unsustainable at current rates"** [[5]](https://karatelabs.io/blog/end-of-locator-hell).

Contoh konkret:

```ts
// Test yang ditulis minggu lalu
await page.click("#pay-now");
```

Tombol payment tetap ada dan berfungsi di UI — tetapi developer baru saja refactor komponennya:

```html
<button data-testid="complete-payment">Pay Now</button>
```

Dari sisi user, checkout masih berjalan normal. Dari sisi CI, pipeline merah. Dari sisi tim, ini waktu investigasi yang terbuang.

### 4.4 Solusi yang Ada Justru Menciptakan Masalah Baru

Industri sudah merespons masalah ini dengan **AI self-healing** — fitur yang secara otomatis mencari elemen pengganti saat selector gagal, agar test bisa lanjut tanpa intervensi manual.

Namun sebuah studi terhadap **437 enterprise implementations** menemukan fakta yang mengkhawatirkan: tim yang menggunakan self-healing mengalami **false positive rate 23% lebih tinggi** dan menghabiskan **31% lebih banyak waktu debugging** akibat perbaikan yang diintroduce AI [[6]](https://bugbug.io/blog/test-automation/self-healing-test-automation/). Lebih jauh, selector-only healing hanya mampu menangani **28% dari seluruh jenis test failure** — selebihnya tidak tercover [[7]](https://www.qawolf.com/blog/self-healing-test-automation-types).

Skenario terburuknya sudah terdokumentasi:

> Tombol "Pay Now" hilang karena product regression. Self-healing menemukan elemen lain yang terlihat mirip secara visual. Test **pass**. Bug lolos ke production.

Ini adalah **false green** — kondisi di mana test pass bukan karena produk benar, tapi karena AI memilih elemen yang salah. Ketika ini terjadi, kepercayaan terhadap automation runtuh sepenuhnya: *"Once a suite is known to 'lie,' engineers stop trusting automation. A green build becomes meaningless."* [[6]](https://bugbug.io/blog/test-automation/self-healing-test-automation/)

### 4.5 Gap yang Belum Terjawab

Di sinilah problem sesungguhnya: tidak ada tool yang dapat menjawab satu pertanyaan sederhana namun krusial ini dengan bukti yang bisa diaudit —

> **Apakah test ini gagal karena UI berubah, atau karena produk benar-benar rusak?**

Self-healing menjawab pertanyaan ini dengan asumsi: "mungkin aman, kita fix saja." SpecHeal menjawabnya dengan bukti: behavior produk diverifikasi terhadap spesifikasi, candidate selector divalidasi langsung di browser, rerun membuktikan hasilnya, dan keputusan recovery tercatat untuk diaudit.

SpecHeal menyelesaikan problem ini dengan safe recovery loop:

```
Playwright failure
-> evidence capture
-> OpenSpec requirement
-> OpenAI verdict
-> browser validation
-> controlled test-file patch
-> rerun proof
-> Jira action
```

---

## 5. Goals

### 5.1 Product Goals

1. Menyediakan dashboard untuk menjalankan scenario recovery UI test.
2. Menggunakan live OpenAI untuk menganalisis failure evidence dan OpenSpec.
3. Membedakan `HEAL`, `PRODUCT BUG`, `SPEC OUTDATED`, `NO_HEAL_NEEDED`, dan `RUN_ERROR`.
4. Membuktikan `HEAL` melalui browser validation, controlled test-file patch, dan rerun proof.
5. Membuat Jira issue secara live untuk hasil recovery yang membutuhkan action.
6. Menyimpan run history dan audit trail ke PostgreSQL.
7. Menyediakan full report yang bisa diaudit oleh QA Engineer dan developer.
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

---

## 6. Non-Goals

Untuk MVP hackathon, SpecHeal tidak menargetkan:

- testing website arbitrary (bukan ShopFlow),
- auto-commit atau auto-merge patch ke repository,
- GitHub PR automation,
- authentication dan multi-tenant workspace,
- support Cypress, Selenium, atau framework lain,
- analytics historis skala besar,
- enterprise policy engine,
- live attachment screenshot langsung ke Jira,
- demo utama untuk `SPEC OUTDATED`,
- heal untuk konteks refactor UI yang sangat kompleks — SpecHeal hanya dapat memperbaiki selector drift yang terlokalisasi, bukan refactor arsitektur komponen secara menyeluruh.

`SPEC OUTDATED` tetap didukung dalam verdict dan schema, tetapi bukan alur demo utama kecuali core MVP selesai lebih awal.

---

## 7. Target Users

### 7.1 QA Engineer

QA Engineer adalah satu-satunya primary user SpecHeal.

Kebutuhan:

- tahu apakah test failure aman diperbaiki atau produk benar-benar rusak,
- melihat evidence kegagalan tanpa harus inspect manual di browser,
- mendapatkan patch preview atau bug report yang bisa langsung ditindaklanjuti,
- memverifikasi bahwa keputusan recovery konsisten dengan requirement produk (OpenSpec),
- mengaudit riwayat run dan memastikan tidak ada false green yang lolos.

Success signal:

- QA Engineer dapat menjalankan scenario, membaca verdict, memahami reasoning-nya, dan meneruskan output ke developer — semuanya dari satu dashboard tanpa terminal.

---

## 8. MVP Scope

### 8.1 Hackathon Context

Refactory Hackathon 2026 mengangkat tema Engineering Productivity x AI. SpecHeal memenuhi semua fondasi wajib:

| Fondasi Wajib | Implementasi di SpecHeal |
| --- | --- |
| OpenSpec | Dipakai sebagai source of truth untuk semua verdict — bukan hanya dokumentasi |
| LLM / AI | OpenAI sebagai core verdict engine dengan structured response dan audit trace |
| Kubernetes | Seluruh runtime MVP (dashboard, Playwright, PostgreSQL) di-deploy ke Kubernetes VPS |
| PostgreSQL | Menyimpan run history, AI trace, evidence, patch, dan Jira publish result |

### 8.2 In Scope

- Dashboard SpecHeal sebagai cockpit utama.
- Seeded demo app: ShopFlow Checkout (cart → checkout → pay → Payment Success).
- Scenario picker: Healthy Flow, Locator Drift, Product Bug.
- Runtime Playwright execution dengan failure evidence capture.
- DOM cleaning dan sensitive data masking.
- Candidate selector extraction dan ranking.
- OpenSpec requirement loading sebagai guardrail.
- Live OpenAI verdict dengan structured response.
- Browser candidate validation (visible, enabled, clickable).
- Rerun proof sebagai bukti HEAL aman.
- Patch preview untuk verdict HEAL.
- Live Jira issue publishing (Task untuk HEAL dan RUN_ERROR, Bug untuk PRODUCT BUG).
- PostgreSQL persistence untuk run history dan audit trail.
- Full report per run dengan AI trace dan evidence.
- Kubernetes deployment untuk seluruh runtime.

### 8.3 Out of Scope (MVP)

Fitur berikut tidak menjadi blocker demo utama:

- Testing terhadap website arbitrary (bukan ShopFlow).
- Auto-commit atau auto-merge patch ke repository.
- GitHub PR automation.
- Authentication dan multi-tenant workspace.
- Support Cypress, Selenium, atau framework lain.
- Analytics historis skala besar.
- Demo utama untuk SPEC OUTDATED (didukung dalam schema, bukan alur demo utama).
- Screenshot attachment langsung ke Jira.
- Heal untuk konteks refactor UI yang sangat kompleks — SpecHeal hanya dapat memperbaiki selector drift yang terlokalisasi, bukan refactor arsitektur komponen secara menyeluruh.

---

## 9. Demo Product: ShopFlow Checkout

ShopFlow Checkout adalah mini checkout app yang menjadi system under test.

Flow user:

```
cart -> checkout -> pay -> Payment Success
```

Alasan memilih checkout:

- mudah dipahami non-technical audience,
- behavior sukses jelas,
- payment action adalah critical flow,
- cocok untuk membedakan locator drift dari product bug,
- requirement OpenSpec dapat ditulis secara spesifik.

ShopFlow memiliki tiga state yang di-seed untuk scenario:

- **normal** — payment flow berjalan normal, `#pay-now` tersedia.
- **drift** — UI direfactor, selector berubah menjadi `[data-testid="complete-payment"]`, payment masih berfungsi.
- **bug** — payment action tidak tersedia, behavior produk rusak.

---

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

- applied patch preview,
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
- tidak ada patch.

### 10.4 SPEC OUTDATED

Makna:

- test lama tidak sesuai dengan flow/requirement terbaru,
- perbaikan tidak cukup dengan mengganti selector,
- action yang benar adalah update test atau mapping test terhadap OpenSpec.

Output:

- Jira Task untuk update test/spec mapping.

Catatan: `SPEC OUTDATED` didukung dalam desain dan schema. Demo utama MVP fokus pada `HEAL` dan `PRODUCT BUG`.

### 10.5 RUN_ERROR

Makna:

- run gagal karena kegagalan operasional sebelum verdict recovery dihasilkan,
- contoh: Playwright crash, OpenAI tidak terkonfigurasi, database tidak tersedia,
- bukan kesalahan produk, bukan locator drift — ini kegagalan sistem SpecHeal sendiri.

Output:

- Jira Task untuk investigasi runtime failure,
- error state yang jelas di dashboard,
- tidak ada patch.

---

## 11. User Stories

Semua user stories ditulis dari perspektif QA Engineer sebagai satu-satunya primary user SpecHeal.

### US-01 — Menjalankan Recovery Scenario

Sebagai QA Engineer, saya ingin memilih scenario recovery dari dashboard dan menjalankannya dengan satu klik, sehingga saya dapat langsung mendapat analisis kegagalan tanpa harus setup apapun secara manual.

Acceptance criteria:

- Dashboard menampilkan scenario picker dengan minimal 3 pilihan: Healthy Flow, Locator Drift, Product Bug.
- Tombol Run aktif setelah scenario dipilih.
- Dashboard menampilkan loading state yang informatif selama run berlangsung.
- Verdict tampil di halaman yang sama tanpa navigasi tambahan.

### US-02 — Memahami Penyebab Kegagalan

Sebagai QA Engineer, saya ingin melihat evidence failure secara lengkap di dashboard, sehingga saya tidak perlu membuka browser inspector, membaca CI log, atau inspect DOM secara manual.

Acceptance criteria:

- Evidence mencakup screenshot halaman pada saat test gagal.
- Evidence mencakup failed selector, Playwright error message, dan target URL.
- Evidence mencakup cleaned DOM yang dapat dibaca — bebas dari noise script, style, dan metadata.
- Ranked candidate list ditampilkan sebagai konteks elemen yang tersedia di halaman.

### US-03 — Memverifikasi Verdict HEAL

Sebagai QA Engineer, saya ingin melihat bukti konkret bahwa verdict HEAL benar-benar aman, sehingga saya tidak perlu mempercayai rekomendasi AI secara blind.

Acceptance criteria:

- Dashboard menampilkan candidate selector yang sudah divalidasi di browser.
- Hasil validasi mencakup: elemen ditemukan, visible, enabled.
- Status rerun ditampilkan: passed/failed beserta hasil akhirnya (Payment Success atau tidak).
- Patch preview menampilkan baris lama dan baris baru dengan penjelasan perubahan.
- Patch tidak auto-commit — hanya preview untuk diserahkan ke developer via Jira Task.

### US-04 — Memahami Dasar Keputusan AI

Sebagai QA Engineer, saya ingin melihat klausul OpenSpec yang dijadikan dasar verdict, sehingga saya dapat memverifikasi bahwa keputusan recovery konsisten dengan requirement produk.

Acceptance criteria:

- OpenSpec clause yang relevan ditampilkan di timeline run.
- OpenSpec clause mendefinisikan behavior (bukan selector implementasi).
- AI trace dapat dibuka untuk melihat prompt lengkap, raw response, dan token usage.

### US-05 — Menangani Product Bug

Sebagai QA Engineer, saya ingin mendapat Jira Bug yang informatif ketika verdict PRODUCT BUG, sehingga saya bisa langsung menyerahkannya ke developer tanpa perlu menulis laporan bug dari nol.

Acceptance criteria:

- Dashboard menampilkan verdict PRODUCT BUG dengan jelas secara visual.
- Dashboard mengkonfirmasi bahwa tidak ada patch yang dihasilkan — tidak ada safe recovery.
- Jira Bug berhasil dibuat dengan summary, evidence, dan OpenSpec reference yang lengkap.
- Issue key dan link Jira ditampilkan di dashboard untuk akses langsung.

### US-06 — Mengakses Riwayat Run

Sebagai QA Engineer, saya ingin membuka kembali report dari run sebelumnya, sehingga saya dapat mengaudit keputusan recovery yang pernah dibuat dan memverifikasi tidak ada false green yang lolos.

Acceptance criteria:

- Dashboard menampilkan daftar recent runs dengan status dan verdict masing-masing.
- Setiap run memiliki full report yang dapat dibuka.
- Full report menampilkan timeline lengkap: test result, evidence, OpenSpec, verdict, proof, Jira result.
- AI trace tersedia di full report untuk keperluan audit teknis.

---

## 12. User Journeys

Semua journey ditulis dari perspektif QA Engineer sebagai primary user SpecHeal.

### 12.1 Journey: QA Engineer — Investigasi Locator Drift (HEAL)

Konteks: QA Engineer menerima notifikasi CI merah setelah tim frontend melakukan refactor komponen. Ia membuka SpecHeal untuk menginvestigasi.

1. QA Engineer membuka dashboard SpecHeal.
2. Ia memilih scenario "Locator Drift" dari scenario picker — sesuai dugaan bahwa ada perubahan UI.
3. Ia klik Run. Dashboard menampilkan loading state.
4. SpecHeal menjalankan Playwright test terhadap ShopFlow menggunakan selector lama (`#pay-now`).
5. Test gagal: selector tidak ditemukan di DOM.
6. SpecHeal otomatis mengambil screenshot, error, cleaned DOM, dan ranked candidate list.
7. SpecHeal memuat OpenSpec clause: payment action harus visible dan enabled saat checkout.
8. SpecHeal memanggil OpenAI — evidence + OpenSpec dikirim, verdict HEAL dikembalikan.
9. SpecHeal memvalidasi candidate selector `[data-testid="complete-payment"]` di browser: ditemukan, visible, enabled.
10. SpecHeal melakukan rerun dengan selector baru — berhasil mencapai Payment Success.
11. Dashboard menampilkan patch preview (lama vs baru), validation proof, dan rerun proof.
12. SpecHeal membuat Jira Task secara otomatis — QA Engineer melihat issue key dan link di dashboard.
13. QA Engineer menyerahkan Jira Task ke developer untuk review dan apply patch. Selesai.

### 12.2 Journey: QA Engineer — Investigasi Product Bug

Konteks: QA Engineer mendapat laporan bahwa flow payment di ShopFlow berperilaku aneh. Ia menjalankan scenario Product Bug untuk memverifikasi.

1. QA Engineer membuka dashboard SpecHeal.
2. Ia memilih scenario "Product Bug" dan klik Run.
3. SpecHeal menjalankan Playwright test — test gagal karena tidak ada payment action yang tersedia.
4. SpecHeal mengambil evidence: screenshot, error, dan DOM yang menunjukkan tidak ada elemen payment.
5. SpecHeal memuat OpenSpec clause: payment completion adalah behavior wajib dari ShopFlow.
6. SpecHeal memanggil OpenAI — mendapat verdict PRODUCT BUG.
7. SpecHeal mengkonfirmasi: tidak ada safe recovery. Tidak ada patch yang dibuat.
8. SpecHeal membuat Jira Bug dengan summary, evidence lengkap, dan OpenSpec reference.
9. QA Engineer melihat verdict PRODUCT BUG dan Jira Bug key di dashboard.
10. QA Engineer menyerahkan Jira Bug ke developer untuk investigasi regression. Selesai.

### 12.3 Journey: QA Engineer — Audit Full Report

Konteks: QA Engineer ingin memverifikasi keputusan recovery yang dibuat sebelumnya — memastikan tidak ada false green yang lolos.

1. QA Engineer membuka dashboard dan melihat daftar recent runs.
2. Ia memilih run yang ingin diaudit dan membuka full report.
3. Ia melihat timeline lengkap: test result → evidence → OpenSpec → verdict → proof → Jira.
4. Ia membuka AI trace: memeriksa prompt yang dikirim ke OpenAI, raw response, dan token usage.
5. Ia membaca klausul OpenSpec yang dijadikan dasar verdict untuk memverifikasi relevansinya.
6. Ia membuka link Jira issue dari full report untuk melihat status tindak lanjut.

---

## 13. Functional Requirements

### FR-001 Dashboard Active Project

SpecHeal harus menampilkan dashboard utama untuk project ShopFlow Checkout.

Acceptance criteria:

- Menampilkan nama project, status OpenSpec, dan status Playwright suite.
- Menampilkan status koneksi Jira dan OpenAI.
- Menyediakan CTA run scenario yang aktif setelah scenario dipilih.

### FR-002 Scenario Picker

Dashboard harus menyediakan tiga scenario: Healthy Flow, Locator Drift, dan Product Bug.

Acceptance criteria:

- User dapat memilih tepat satu scenario sebelum run.
- Scenario terpilih terlihat jelas secara visual.
- Tiap scenario menentukan target state ShopFlow yang berbeda.

### FR-003 Runtime Test Execution

SpecHeal harus menjalankan Playwright test saat user memulai run.

Acceptance criteria:

- Playwright membuka ShopFlow dengan target URL yang sesuai scenario.
- Test menjalankan action dengan selector awal yang telah ditentukan.
- Result menyimpan: status pass/fail, selector, target URL, test name, step name, error, dan duration.

### FR-004 Failure Evidence Capture

Jika test gagal, SpecHeal harus mengambil evidence secara otomatis.

Acceptance criteria:

- Evidence mencakup: error message, screenshot, failed selector, target URL.
- Evidence mencakup: raw DOM length, cleaned DOM, visible page evidence, ranked candidate list.
- Evidence tersimpan dan dapat ditampilkan di dashboard serta full report.

### FR-005 DOM Cleaning and Masking

SpecHeal harus membersihkan DOM sebelum dikirim ke OpenAI.

Acceptance criteria:

- Menghapus noise: head, script, style, meta, link, noscript, comments, SVG, iframe, canvas.
- Masking email dan sensitive input values.
- Menyimpan raw DOM length dan cleaned DOM length untuk perbandingan.

### FR-006 Candidate Selector Extraction

SpecHeal harus mengekstrak candidate element yang relevan dari DOM yang sudah dibersihkan.

Acceptance criteria:

- Candidate diambil dari body (bukan head metadata).
- Candidate click harus visible, enabled, dan interaktif.
- Candidate diberi score/ranking yang dapat dilihat di report.
- Zero-candidate state harus eksplisit tercatat di evidence.

### FR-007 OpenSpec Guardrail

SpecHeal harus menggunakan OpenSpec sebagai source of truth untuk semua verdict.

Acceptance criteria:

- Prompt OpenAI menyertakan OpenSpec clause yang relevan untuk scenario.
- OpenSpec mendefinisikan behavior (bukan selector implementasi).
- HEAL hanya valid jika behavior tetap memenuhi OpenSpec.
- OpenSpec clause ditampilkan di report sebagai referensi verdict.

### FR-008 Live OpenAI Verdict

SpecHeal harus memanggil live OpenAI API untuk menghasilkan verdict terstruktur.

Acceptance criteria:

- OpenAI dipanggil untuk setiap failed run yang membutuhkan recovery analysis.
- Response harus structured dan parseable (mendukung HEAL, PRODUCT BUG, SPEC OUTDATED).
- Dashboard menampilkan model, prompt, raw response, parsed response, token usage.
- Jika OpenAI gagal, run menampilkan failure state yang jujur dengan opsi retry.

### FR-009 Candidate Browser Validation

Jika verdict HEAL, SpecHeal harus memvalidasi candidate selector langsung di browser.

Acceptance criteria:

- Candidate selector harus match tepat satu elemen.
- Elemen harus visible dan enabled saat validasi.
- Elemen harus dapat menerima click trial.
- Patch tidak boleh ditandai safe jika validasi gagal.

### FR-010 Rerun Proof

Jika candidate validation berhasil, SpecHeal harus melakukan rerun sebagai bukti HEAL.

Acceptance criteria:

- Rerun menggunakan candidate selector dan scenario yang sama.
- Rerun harus mencapai Payment Success untuk ditandai passed.
- Patch hanya ditandai safe jika rerun passed.

### FR-011 Patch Preview

Untuk verdict HEAL, SpecHeal harus menampilkan patch preview yang actionable.

Acceptance criteria:

- Patch mencakup: target file, baris lama, baris baru, dan penjelasan perubahan.
- Patch tidak auto-commit dan tidak auto-merge.
- Patch ditampilkan di dashboard dan tersimpan di PostgreSQL.

### FR-012 Jira Issue Publishing

SpecHeal harus membuat Jira issue secara live untuk setiap recovery result yang membutuhkan action.

Acceptance criteria:

- Jira Task dibuat untuk verdict HEAL.
- Jira Bug dibuat untuk verdict PRODUCT BUG.
- Jira Task dibuat untuk verdict SPEC OUTDATED.
- Jira Task dibuat untuk verdict RUN_ERROR — untuk investigasi kegagalan operasional.
- Payload berisi: summary, description (ADF), issue type, labels, verdict, evidence, OpenSpec reference, proof.
- Dashboard menampilkan issue key dan URL jika berhasil, atau error state jika gagal.
- Run tetap tersimpan di PostgreSQL meskipun Jira publish gagal.

### FR-013 PostgreSQL Persistence

SpecHeal harus menyimpan seluruh run data ke PostgreSQL.

Acceptance criteria:

- Menyimpan: run metadata, verdict, reason, AI trace, evidence summary, patch, validation result, Jira result.
- Menyediakan endpoint recent runs untuk dashboard.
- Menyediakan endpoint full report by run ID.

---

## 14. Integration Requirements

### 14.1 OpenAI

OpenAI adalah core verdict engine. Prompt harus menyertakan konteks teknis yang cukup untuk menghasilkan verdict yang dapat dipercaya.

Komponen prompt wajib:

- test name dan step name,
- failed selector dan Playwright error,
- visible evidence dan ranked candidates,
- OpenSpec clause yang relevan,
- expected output schema (verdict, reason, confidence, candidate selector, patch/bug report).

Konfigurasi:

- Model dikonfigurasi via environment variable `OPENAI_MODEL`.
- API key via `OPENAI_API_KEY` (server-side only).

### 14.2 Jira

Jira digunakan sebagai workflow output — bukan hanya notifikasi, tapi issue yang actionable.

| Verdict | Issue Type | Action |
| --- | --- | --- |
| `HEAL` | Task | Review dan apply patch locator ke test file |
| `PRODUCT BUG` | Bug | Investigasi dan fix product regression |
| `SPEC OUTDATED` | Task | Update test atau spec mapping |
| `RUN_ERROR` | Task | Investigasi kegagalan operasional SpecHeal runtime |
| `NO_HEAL_NEEDED` | — | Tidak wajib membuat issue |

Variabel konfigurasi Jira:

```env
JIRA_SITE_URL=https://<team>.atlassian.net
JIRA_EMAIL=<email akun Jira>
JIRA_API_TOKEN=<API token dari Atlassian>
JIRA_PROJECT_KEY=<project key target>
JIRA_TASK_ISSUE_TYPE=Task
JIRA_BUG_ISSUE_TYPE=Bug
```

### 14.3 PostgreSQL

PostgreSQL menyimpan seluruh artifact recovery untuk audit trail dan reporting:

- run history dengan metadata lengkap,
- AI trace: prompt, response, token usage, duration, estimated cost,
- evidence: screenshot reference (base64), DOM, candidates,
- patch preview, validation result, dan rerun result,
- Jira publish result: status, issue key, issue URL, error.

### 14.4 Kubernetes

- Dashboard/API app sebagai container image.
- Playwright runtime dengan browser dependencies.
- PostgreSQL sebagai StatefulSet atau managed service.
- Secret untuk OpenAI key, Jira token, dan database URL.
- Service/Ingress untuk membuka dashboard ke publik.

---

## 15. Data Model Konseptual

### 15.1 Run

- `id`
- `projectId`
- `scenarioId`
- `scenarioState`
- `status` — `pending | running | completed | failed`
- `verdict` — `NO_HEAL_NEEDED | HEAL | PRODUCT BUG | SPEC OUTDATED | RUN_ERROR`
- `reason`
- `confidence`
- `failedStage`
- `baselineSelector`
- `candidateSelector`
- `testFilePath`
- `openSpecPath`
- `openSpecClause`
- `createdAt`
- `updatedAt`

### 15.2 Evidence

- `runId`
- `error`
- `screenshot` (base64)
- `failedSelector`
- `targetUrl`
- `rawDomLength`
- `cleanedDomLength`
- `cleanedDom`
- `visibleEvidence`
- `candidates`

### 15.3 AI Trace

- `runId`
- `model`
- `systemPrompt`
- `userPrompt`
- `rawResponse`
- `parsedResponse`
- `usage`
- `estimatedCost`
- `errorCode`
- `errorMessage`
- `durationMs`

### 15.4 Validation Result

- `runId`
- `selector`
- `passed`
- `elementCount`
- `reason`

### 15.5 Patch Preview

- `runId`
- `targetFile`
- `oldLine`
- `newLine`
- `explanation`

### 15.6 Rerun Result

- `runId`
- `passed`
- `error`
- `durationMs`

### 15.7 Jira Publish Result

- `runId`
- `status`
- `issueKey`
- `issueUrl`
- `issueId`
- `payloadSummary`
- `error`
- `createdAt`

---

## 16. UX Requirements

SpecHeal harus terasa seperti cockpit kerja engineering — bukan landing page, bukan chatbot, bukan form kosong.

Prinsip:

- first screen langsung menunjukkan produk, project, dan action,
- scenario picker mudah dipahami tanpa membaca instruksi,
- verdict sangat jelas dengan visual differentiation yang kuat (warna, ikon, label),
- evidence ringkas di permukaan, detail audit tersedia di drawer/full report,
- OpenSpec tampil sebagai locked source of truth,
- Jira status tampil sebagai final workflow step ketika run membutuhkan action.

Primary layout:

- top bar: brand, project, selected scenario, status/verdict,
- control panel: scenario picker dan run CTA,
- report panel: timeline run,
- evidence panel: screenshot, patch, report output, Jira status jika applicable,
- trace drawer: prompt, raw output, validation details,
- full report page: audit lengkap.

---

## 17. Non-Functional Requirements

### 17.1 Reliability

- Failed OpenAI call tidak boleh membuat UI blank — harus ada error state yang jelas.
- Failed Jira publish tidak boleh menghapus report — run tetap tersimpan.
- Run status harus selalu terdefinisi: pending, running, completed, atau failed.
- Dashboard harus dapat di-reload tanpa kehilangan data run sebelumnya.

### 17.2 Security

- OpenAI API key, Jira token, dan database URL hanya tersedia server-side.
- Secret disimpan sebagai environment variable atau Kubernetes Secret — tidak di-hardcode.
- Token tidak boleh muncul di log client atau response API publik.
- DOM evidence harus masking sensitive values sebelum dikirim ke OpenAI atau disimpan.

### 17.3 Performance

- Dashboard initial load: < 3 detik pada koneksi standar.
- Polling run status: interval cukup cepat untuk demo (disarankan < 3 detik per poll).
- Long-running operation (Playwright, OpenAI, Jira): harus memiliki loading state yang terlihat.

### 17.4 Observability

- Setiap run menyimpan timestamps: `createdAt`, `updatedAt`.
- Error state disimpan di PostgreSQL dan ditampilkan di dashboard.
- AI duration, token usage, dan estimated cost ditampilkan di AI trace jika tersedia.

### 17.5 Usability

- QA Engineer dapat menjalankan scenario tanpa membaca instruksi panjang — UI harus self-explanatory.
- Verdict harus terlihat jelas dengan visual differentiation yang kuat (warna, ikon, label).
- Developer dapat membuka full report untuk audit teknis tanpa navigasi lebih dari 2 langkah.

---

## 18. Success Metrics

MVP dianggap berhasil jika:

1. Dashboard dapat dibuka dari deployment Kubernetes.
2. Locator Drift scenario berjalan end-to-end.
3. Product Bug scenario berjalan end-to-end.
4. OpenAI benar-benar dipanggil pada failed run.
5. OpenSpec clause terlihat di prompt/report.
6. `HEAL` menghasilkan validation proof, applied test patch, dan rerun proof.
7. `PRODUCT BUG` tidak menghasilkan safe patch.
8. Jira Task berhasil dibuat untuk `HEAL`.
9. Jira Bug berhasil dibuat untuk `PRODUCT BUG`.
10. PostgreSQL menyimpan run history.
11. Full report dapat dibuka.
12. Error state OpenAI/Jira ditangani dengan jujur.

---

## 19. Release Criteria

MVP siap demo jika:

- semua environment variable wajib tersedia,
- dashboard dapat diakses publik,
- OpenAI call berhasil minimal pada Locator Drift dan Product Bug,
- Jira issue berhasil dibuat dari dashboard,
- PostgreSQL menyimpan run,
- Kubernetes deployment stabil,
- demo dapat dilakukan dalam 5 menit.

---

## 20. Risks and Mitigations

| Risiko | Dampak | Prob. | Mitigasi |
| --- | --- | --- | --- |
| OpenAI API gagal saat demo | Tinggi | Rendah | Tampilkan error jujur + retry button. Siapkan API key cadangan. Validasi key sebelum demo. |
| Jira credential belum dikonfigurasi | Sedang | Sedang | Buat config health check di dashboard. Validasi project key saat startup. Siapkan akun Jira demo. |
| Jira issue type berbeda dari konfigurasi | Sedang | Sedang | Gunakan configurable issue type via env variable. Test create issue sehari sebelum demo. |
| Playwright gagal jalan di container | Tinggi | Sedang | Gunakan base image resmi Playwright dengan browser deps. Test di environment yang sama dengan deployment. |
| Scope melebar saat development | Tinggi | Tinggi | Hard-scope ke Locator Drift dan Product Bug. Fitur lain masuk Future Roadmap, bukan blocker. |
| AI verdict tidak akurat | Sedang | Rendah | Wajib ada browser validation dan rerun proof. Verdict AI tidak final tanpa bukti. |
| OpenSpec terlalu ambigu | Tinggi | Sedang | Tulis OpenSpec behavior-first, selector-agnostic. Review sebelum demo dengan contoh test case. |

---

## 21. Dependencies

- OpenAI API key yang valid dan aktif.
- Jira Cloud site dengan project key yang sudah dibuat.
- Jira API token dengan permission create issue.
- Jira project memiliki issue type Task dan Bug, atau nama issue type dikonfigurasi via environment variable.
- PostgreSQL instance (managed atau self-hosted).
- Kubernetes VPS dari penyelenggara hackathon dengan network egress ke OpenAI dan Atlassian.

---

## 22. Future Roadmap

Setelah MVP hackathon selesai dan terbukti, berikut prioritas pengembangan lanjutan:

**Short-Term (Post-Hackathon)**

- Demo penuh untuk SPEC OUTDATED dengan scenario nyata.
- Screenshot attachment langsung ke Jira issue.
- CI integration untuk membaca failed test run dari pipeline nyata (bukan seeded).

**Medium-Term**

- GitHub PR patch suggestion — bukan hanya preview, tapi bisa buka PR langsung.
- Multi-project OpenSpec mapping (lebih dari satu codebase).
- Support Cypress dan Selenium sebagai alternatif Playwright.
- Trend dashboard: visualisasi selector drift over time per project.

**Long-Term**

- Approval policy engine untuk auto-PR dengan guardrail team-level.
- Multi-tenant SaaS dengan workspace isolation per tim.
- Enterprise analytics: MTTR dari CI failure, false-green rate, heal success rate.

---

## 23. Glossary

| Istilah | Definisi |
| --- | --- |
| OpenSpec | Spesifikasi behavior produk yang menjadi source of truth untuk semua verdict. Ditulis behavior-first, selector-agnostic. |
| Playwright | Framework browser automation test yang digunakan sebagai runtime execution SpecHeal. |
| Selector drift | Kondisi di mana selector test berubah atau hilang, namun behavior produk yang sebenarnya masih benar. |
| False green | Kondisi di mana test pass namun behavior produk sebenarnya melanggar requirement — akibat self-healing yang tidak tervalidasi. |
| HEAL | Verdict bahwa test gagal karena selector drift dan aman diperbaiki dengan patch locator yang tervalidasi. |
| PRODUCT BUG | Verdict bahwa produk melanggar requirement OpenSpec — tidak ada recovery yang aman, output adalah Jira Bug. |
| SPEC OUTDATED | Verdict bahwa test atau spec mapping perlu diperbarui karena flow produk berubah secara intentional. |
| NO_HEAL_NEEDED | Verdict bahwa test berjalan sukses dan tidak membutuhkan recovery. |
| RUN_ERROR | Terminal state operasional ketika run gagal sebelum verdict recovery dihasilkan — akibat Playwright crash, OpenAI tidak terkonfigurasi, atau kegagalan sistem lainnya. Output: Jira Task untuk investigasi. |
| Evidence capture | Proses pengambilan screenshot, DOM, error, dan candidates saat test gagal. |
| Candidate selector | Element DOM yang diusulkan AI sebagai pengganti selector yang gagal. |
| Rerun proof | Bukti bahwa test berhasil dijalankan ulang dengan candidate selector baru dan mencapai expected result. |
| AI trace | Log lengkap interaksi dengan OpenAI: prompt, raw response, parsed response, token usage, duration. |
| Jira publisher | Komponen SpecHeal yang bertanggung jawab membuat dan mempublikasikan Jira issue dari recovery report. |
| ShopFlow Checkout | Mini checkout app yang menjadi seeded system under test untuk demo SpecHeal. |
