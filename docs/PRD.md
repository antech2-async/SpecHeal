# Product Requirements Document: SpecHeal

Status: Draft  
Tim: Merge Kalau Berani  
Event: Refactory Hackathon 2026, Telkom Round  
Tanggal: 12 Mei 2026  
Target pembaca: QA Engineer, developer, dan stakeholder hackathon

---

## 1. Executive Summary

SpecHeal adalah recovery cockpit berbasis AI yang membantu tim engineering menangani kegagalan UI automation test, dengan fokus MVP pada Playwright.

Ketika test gagal, SpecHeal menjawab satu pertanyaan penting:

> Apakah test ini aman diperbaiki, atau produk benar-benar rusak?

SpecHeal menjalankan test di browser, mengambil bukti kegagalan, membaca OpenSpec sebagai kontrak perilaku produk, meminta OpenAI menghasilkan verdict terstruktur, memvalidasi candidate selector di browser, menerapkan patch locator ke test file saat aman, membuktikan hasilnya dengan rerun, menyimpan report ke PostgreSQL, lalu mempublikasikan hasil yang membutuhkan tindak lanjut ke Jira.

Core thesis:

> SpecHeal bukan sekadar membuat test hijau. SpecHeal membuat keputusan recovery bisa dipercaya dan diaudit.

---

## 2. Product Positioning

Kategori produk:

```
AI-assisted UI test recovery cockpit
```

SpecHeal berada di persimpangan antara test automation, CI failure triage, AI developer tools, dan QA workflow automation.

SpecHeal bukan:

- pengganti Playwright,
- QA chatbot generik,
- website crawler,
- Jira ticket generator biasa,
- tool yang otomatis membuat semua test gagal menjadi hijau.

Pembeda utama:

```
AI proposes. OpenSpec guards. Browser validates. Jira tracks.
```

---

## 3. Hackathon Context

Refactory Hackathon 2026 mengangkat tema Engineering Productivity x AI. Produk yang dibangun harus berupa solusi nyata yang bekerja end-to-end.

Bagi SpecHeal, engineering productivity berarti:

- mengurangi waktu investigasi kegagalan test,
- mengubah CI failure menjadi keputusan yang jelas dan bisa ditindaklanjuti,
- menjaga kepercayaan terhadap regression suite,
- mencegah false green dari self-healing yang tidak tervalidasi.

Kebutuhan utama hackathon yang dipenuhi SpecHeal:

- OpenAI dipakai sebagai core verdict engine dengan structured output.
- OpenSpec dipakai sebagai source of truth requirement.
- PostgreSQL dipakai untuk menyimpan run dan seluruh artifact recovery.
- Jira dipakai sebagai workflow output yang actionable.
- Seluruh runtime dideploy ke Kubernetes di VPS.
- Produk dapat digunakan langsung melalui dashboard, bukan hanya ditonton lewat slide.

---

## 4. Problem Statement

### 4.1 Automation Testing Sudah Jadi Infrastruktur — Bukan Eksperimen

Hari ini, **77% perusahaan software** sudah mengadopsi automated testing dalam bentuk tertentu, dan market-nya tumbuh menjadi **$29.29 miliar di 2025** dengan CAGR 15.3% [[1]](https://testlio.com/blog/test-automation-statistics/). Perusahaan yang berhasil mengadopsi Agile dengan automation melaporkan produktivitas **30–50% lebih tinggi** dan time-to-market **2–3× lebih cepat** [[2]](https://katalon.com/resources-center/blog/test-automation-statistics-for-2025).

Automation testing bukan lagi pilihan — ia adalah fondasi pengembangan software modern. Regression suite yang andal memungkinkan tim bergerak cepat tanpa khawatir merusak production.

### 4.2 Masalah yang Tumbuh Diam-diam: CI Failure yang Tidak Bisa Dipercaya

Di balik angka adopsi yang tinggi, ada krisis kepercayaan yang berkembang diam-diam.

Di Google, **84% CI failure bukan dari product bug**, melainkan dari test yang rapuh [[3]](https://slack.engineering/handling-flaky-tests-at-scale-auto-detection-suppression/). Di Slack, sebelum ada remediation khusus, **56.76% CI failure** berasal dari test yang tidak stabil [[3]](https://slack.engineering/handling-flaky-tests-at-scale-auto-detection-suppression/). Atlassian membuang lebih dari **150.000 developer hours per tahun** hanya untuk menangani masalah ini [[4]](https://www.datadoghq.com/knowledge-center/flaky-tests/). Secara industri, **40% waktu QA team** dihabiskan untuk maintenance test — bukan untuk menemukan bug [[4]](https://www.datadoghq.com/knowledge-center/flaky-tests/).

Hasilnya: "CI merah" kehilangan makna. Tim tidak tahu apakah pipeline merah berarti produk rusak atau test yang perlu diperbarui.

### 4.3 Akar Masalahnya: Locator Drift

Sumber utama CI failure yang tidak relevan adalah **locator drift** — kondisi di mana selector test gagal karena UI berubah, tetapi behavior produk sebenarnya masih benar.

Setiap sprint dua minggu, diperkirakan **15–25% test suite** gagal karena perubahan locator, bukan karena regresi produk [[5]](https://karatelabs.io/blog/end-of-locator-hell). Tim QA menghabiskan **sekitar 2 hari per sprint** hanya untuk memperbaiki test yang rusak akibat perubahan ini [[5]](https://karatelabs.io/blog/end-of-locator-hell).

Contoh konkret:

```ts
// Test yang berjalan sempurna selama berbulan-bulan
await page.click("#pay-now");
```

Tombol payment tetap ada dan berfungsi — tetapi developer baru saja refactor komponennya:

```html
<button data-testid="complete-payment">Pay Now</button>
```

Dari sisi pengguna, checkout masih berjalan normal. Dari sisi CI, pipeline merah. Dari sisi tim, ini waktu investigasi yang terbuang.

### 4.4 Solusi yang Ada Justru Menimbulkan Masalah Baru

Industri sudah merespons dengan **AI self-healing** — fitur yang secara otomatis mencari elemen pengganti saat selector gagal agar test bisa lanjut tanpa intervensi manual.

Namun sebuah studi terhadap **437 enterprise implementations** menemukan hal yang mengkhawatirkan: tim yang menggunakan self-healing mengalami **false positive rate 23% lebih tinggi** dan menghabiskan **31% lebih banyak waktu debugging** akibat perbaikan yang diintroduce oleh AI [[6]](https://bugbug.io/blog/test-automation/self-healing-test-automation/). Selector-only healing pun hanya mampu menangani **28% dari seluruh jenis kegagalan test** [[7]](https://www.qawolf.com/blog/self-healing-test-automation-types).

Skenario terburuknya sudah terdokumentasi:

> Tombol "Pay Now" hilang karena product regression. Self-healing menemukan elemen lain yang terlihat mirip. Test **pass**. Bug lolos ke production.

Inilah **false green** — test pass bukan karena produk benar, tapi karena AI memilih elemen yang salah. *"Once a suite is known to 'lie,' engineers stop trusting automation. A green build becomes meaningless."* [[6]](https://bugbug.io/blog/test-automation/self-healing-test-automation/)

### 4.5 Gap yang Belum Terjawab

Tidak ada tool yang menjawab satu pertanyaan sederhana namun krusial ini dengan bukti yang bisa diaudit:

> **Apakah test ini gagal karena UI berubah, atau karena produk benar-benar rusak?**

Self-healing menjawab pertanyaan ini dengan asumsi. SpecHeal menjawabnya dengan bukti: behavior produk diverifikasi terhadap spesifikasi, candidate selector divalidasi langsung di browser, rerun membuktikan hasilnya, dan setiap keputusan recovery tercatat untuk diaudit.

```
Playwright failure
  → evidence capture
  → OpenSpec requirement
  → OpenAI verdict
  → browser validation
  → controlled patch application
  → rerun proof
  → Jira action
```

---

## 5. Goals

### 5.1 Product Goals

1. Menyediakan dashboard untuk menjalankan scenario recovery UI test.
2. Menggunakan live OpenAI untuk menganalisis bukti kegagalan berdasarkan OpenSpec.
3. Membedakan `HEAL`, `PRODUCT BUG`, `SPEC OUTDATED`, `NO_HEAL_NEEDED`, dan `RUN_ERROR`.
4. Membuktikan `HEAL` melalui browser validation, controlled patch application, dan rerun proof.
5. Membuat Jira issue secara live untuk hasil recovery yang membutuhkan tindak lanjut.
6. Menyimpan run history dan audit trail ke PostgreSQL.
7. Menampilkan rincian penggunaan token dan estimasi biaya setiap kali OpenAI dipanggil.
8. Membuat ranking kandidat selector yang dapat dijelaskan alasannya.
9. Menyediakan full report yang dapat diaudit oleh QA Engineer dan developer.
10. Menyediakan deployment Kubernetes untuk seluruh runtime MVP.

### 5.2 Demo Goals

Demo harus membuktikan:

- Locator drift dapat di-heal secara aman dan tervalidasi.
- Product bug tidak boleh dipaksa menjadi test hijau.
- OpenAI benar-benar dipanggil untuk menghasilkan verdict.
- OpenSpec benar-benar digunakan sebagai pembatas keputusan AI.
- Jira benar-benar menerima issue dari hasil recovery.
- Produk berjalan end-to-end dari dashboard sampai report.

### 5.3 Business/Impact Goals

SpecHeal harus menunjukkan nilai nyata bagi produktivitas tim engineering:

- mengurangi investigasi manual setelah CI failure,
- mempercepat keputusan apakah test perlu diperbaiki atau produk yang bermasalah,
- menjaga kepercayaan terhadap automated test,
- menghasilkan output yang langsung dapat ditindaklanjuti di Jira.

---

## 6. Non-Goals

Untuk MVP hackathon, SpecHeal tidak menargetkan:

- testing terhadap website selain ShopFlow,
- auto-commit atau auto-merge patch ke repository,
- GitHub PR automation,
- autentikasi dan multi-tenant workspace,
- dukungan Cypress, Selenium, atau framework lain,
- analitik historis skala besar,
- enterprise policy engine,
- lampiran screenshot langsung ke Jira,
- demo utama untuk `SPEC OUTDATED`,
- recovery untuk refactor UI yang sangat kompleks — SpecHeal hanya dapat memperbaiki selector drift yang terlokalisasi, bukan perombakan struktur komponen secara menyeluruh.

`SPEC OUTDATED` tetap didukung dalam verdict dan schema, tetapi bukan alur demo utama kecuali core MVP selesai lebih awal.

---

## 7. Target Users

### 7.1 QA Engineer

QA Engineer adalah satu-satunya primary user SpecHeal.

Kebutuhan:

- tahu apakah kegagalan test aman diperbaiki atau produk benar-benar rusak,
- melihat bukti kegagalan tanpa harus inspect manual di browser,
- memahami alasan di balik keputusan AI — bukan hanya menerima hasilnya,
- mendapatkan patch preview atau bug report yang bisa langsung ditindaklanjuti,
- mengaudit riwayat run dan memastikan tidak ada false green yang lolos.

Success signal:

- QA Engineer dapat menjalankan scenario, membaca verdict beserta alasannya, dan meneruskan output ke developer — semuanya dari satu dashboard tanpa perlu membuka terminal.

---

## 8. MVP Scope

### 8.1 Hackathon Context

Refactory Hackathon 2026 mengangkat tema Engineering Productivity x AI. SpecHeal memenuhi semua fondasi wajib:

| Fondasi Wajib | Implementasi di SpecHeal |
| --- | --- |
| OpenSpec | Dipakai sebagai source of truth untuk semua verdict — bukan hanya dokumentasi |
| LLM / AI | OpenAI sebagai core verdict engine dengan structured response dan audit trace |
| Kubernetes | Seluruh runtime MVP (dashboard, Playwright, PostgreSQL) di-deploy ke Kubernetes VPS |
| PostgreSQL | Menyimpan run history, AI trace, evidence, patch, dan hasil Jira publish |

### 8.2 In Scope

- Dashboard SpecHeal sebagai cockpit utama.
- Seeded demo app: ShopFlow Checkout (cart → checkout → pay → Payment Success).
- Scenario picker: Healthy Flow, Locator Drift, Product Bug.
- Runtime Playwright execution dengan failure evidence capture.
- DOM cleaning dan masking data sensitif.
- Visible page evidence: judul halaman, URL, teks, payment section, pesan error.
- DOM noise summary: ringkasan tag dan atribut yang dihapus saat cleaning.
- Candidate selector extraction, ranking, dan penjelasan alasan ranking.
- OpenSpec requirement loading sebagai pembatas keputusan AI.
- Live OpenAI verdict dengan structured response.
- Browser candidate validation (visible, enabled, clickable).
- Controlled patch application — patch line dihasilkan SpecHeal dari validated selector, bukan dari teks OpenAI.
- Rerun proof dari test file yang sudah dipatch.
- Patch preview untuk verdict HEAL.
- Transparansi biaya AI: token usage, estimated cost, dan breakdown per komponen.
- Copy-ready output: patch diff, ringkasan recovery, dan konteks Jira.
- Demo status strip: scenario aktif, run state, dan expected decision.
- Staged recovery progress view selama run berlangsung.
- Live Jira issue publishing (Task untuk HEAL dan RUN_ERROR, Bug untuk PRODUCT BUG).
- PostgreSQL persistence untuk run history dan audit trail.
- Full report per run dengan AI trace, evidence, dan bukti recovery.
- Kubernetes deployment untuk seluruh runtime.

### 8.3 Out of Scope (MVP)

- Testing terhadap website selain ShopFlow.
- Auto-commit atau auto-merge patch ke repository.
- GitHub PR automation.
- Autentikasi dan multi-tenant workspace.
- Dukungan Cypress, Selenium, atau framework lain.
- Analitik historis skala besar.
- Demo utama untuk SPEC OUTDATED.
- Lampiran screenshot langsung ke Jira.
- Recovery untuk refactor UI yang sangat kompleks.

---

## 9. Demo Product: ShopFlow Checkout

ShopFlow Checkout adalah mini checkout app yang menjadi system under test.

Flow pengguna:

```
cart → checkout → pay → Payment Success
```

Alasan memilih checkout:

- mudah dipahami oleh audiens non-teknis,
- behavior sukses jelas dan terukur,
- payment action adalah critical flow yang representatif,
- cocok untuk membedakan locator drift dari product bug,
- requirement OpenSpec dapat ditulis secara spesifik dan behavior-first.

ShopFlow memiliki tiga state yang di-seed untuk scenario:

- **normal** — payment flow berjalan normal, `#pay-now` tersedia.
- **drift** — UI direfactor, selector berubah menjadi `[data-testid="complete-payment"]`, payment masih berfungsi.
- **bug** — payment action tidak tersedia, behavior produk rusak.

---

## 10. Supported Terminal Results

Di codebase, `run.verdict` menyimpan terminal result yang ditampilkan di dashboard dan disimpan ke PostgreSQL. Live OpenAI hanya menghasilkan recovery verdict untuk failed run: `HEAL`, `PRODUCT BUG`, atau `SPEC OUTDATED`. `NO_HEAL_NEEDED` dan `RUN_ERROR` ditetapkan oleh orchestrator SpecHeal.

### 10.1 NO_HEAL_NEEDED

Makna:

- test berjalan sukses dengan selector saat ini,
- tidak ada kegagalan yang perlu di-recover.

Output:

- report sukses tanpa Jira issue.

### 10.2 HEAL

Makna:

- test gagal karena locator drift,
- behavior produk tetap sesuai OpenSpec,
- candidate selector baru valid dan tervalidasi di browser,
- rerun dari test file yang sudah dipatch berhasil mencapai Payment Success.

Output:

- patch preview (diff lama vs baru),
- validation proof,
- rerun proof,
- Jira Task untuk review dan apply patch.

### 10.3 PRODUCT BUG

Makna:

- behavior yang diwajibkan OpenSpec hilang atau rusak,
- tidak ada recovery yang aman,
- test tidak boleh dipaksa hijau.

Output:

- Jira Bug dengan evidence lengkap,
- tidak ada patch.

### 10.4 SPEC OUTDATED

Makna:

- test tidak lagi sesuai dengan flow atau requirement terbaru,
- perbaikan tidak cukup hanya dengan mengganti selector — test atau mapping-nya yang perlu diperbarui.

Output:

- Jira Task untuk update test atau spec mapping.

Catatan: `SPEC OUTDATED` didukung dalam desain dan schema. Demo utama MVP fokus pada `HEAL` dan `PRODUCT BUG`.

### 10.5 RUN_ERROR

Makna:

- run gagal karena kegagalan operasional sebelum recovery verdict dari OpenAI dihasilkan,
- contoh: Playwright crash, OpenAI tidak terkonfigurasi, atau database tidak tersedia,
- bukan kesalahan produk, bukan locator drift — ini kegagalan sistem SpecHeal sendiri.

Output:

- Jira Task untuk investigasi runtime failure,
- error state yang jelas di dashboard,
- tidak ada patch.

---

## 11. User Stories

Semua user stories ditulis dari perspektif QA Engineer sebagai satu-satunya primary user SpecHeal.

### US-01 — Menjalankan Recovery Scenario

Sebagai QA Engineer, saya ingin memilih scenario recovery dari dashboard dan menjalankannya dengan satu klik, sehingga saya bisa langsung mendapat analisis kegagalan tanpa setup manual.

Acceptance criteria:

- Dashboard menampilkan scenario picker dengan minimal 3 pilihan: Healthy Flow, Locator Drift, Product Bug.
- Tombol Run aktif setelah scenario dipilih, dan tidak bisa diklik ulang selama run masih berlangsung.
- Dashboard menampilkan progress recovery secara bertahap selama run berlangsung.
- Verdict tampil di halaman yang sama tanpa navigasi tambahan.

### US-02 — Memahami Penyebab Kegagalan

Sebagai QA Engineer, saya ingin melihat bukti kegagalan secara lengkap di dashboard, sehingga saya tidak perlu membuka browser inspector, membaca CI log, atau inspect DOM secara manual.

Acceptance criteria:

- Evidence mencakup screenshot halaman saat test gagal.
- Evidence mencakup failed selector, Playwright error message, dan target URL.
- Evidence mencakup cleaned DOM yang dapat dibaca — bebas dari noise script, style, dan metadata.
- Evidence mencakup ringkasan apa saja yang dihapus saat DOM cleaning.
- Evidence mencakup visible page evidence: judul halaman, teks body, teks payment section, dan pesan error jika ada.
- Ranked candidate list ditampilkan beserta skor dan penjelasan alasan ranking-nya.

### US-03 — Memverifikasi Verdict HEAL

Sebagai QA Engineer, saya ingin melihat bukti konkret bahwa verdict HEAL benar-benar aman, sehingga saya tidak perlu mempercayai rekomendasi AI secara blind.

Acceptance criteria:

- Dashboard menampilkan candidate selector yang sudah divalidasi di browser.
- Hasil validasi mencakup: elemen ditemukan, visible, enabled.
- Status rerun ditampilkan: passed atau failed, beserta hasil akhirnya.
- Patch preview menampilkan diff lama vs baru dengan penjelasan perubahan.
- Patch tidak auto-commit — hanya preview untuk diserahkan ke developer via Jira Task.
- Patch line dihasilkan SpecHeal dari selector yang tervalidasi, bukan dari teks OpenAI.

### US-04 — Memahami Dasar Keputusan AI

Sebagai QA Engineer, saya ingin melihat klausul OpenSpec yang dijadikan dasar verdict, sehingga saya bisa memverifikasi bahwa keputusan recovery konsisten dengan requirement produk.

Acceptance criteria:

- OpenSpec clause yang relevan ditampilkan di timeline run.
- OpenSpec clause mendefinisikan behavior — bukan selector implementasi.
- AI trace dapat dibuka untuk melihat prompt lengkap, raw response, token usage, dan estimasi biaya.

### US-05 — Menangani Product Bug

Sebagai QA Engineer, saya ingin mendapat Jira Bug yang informatif ketika verdict PRODUCT BUG, sehingga saya bisa langsung menyerahkannya ke developer tanpa menulis laporan dari nol.

Acceptance criteria:

- Dashboard menampilkan verdict PRODUCT BUG dengan jelas secara visual.
- Dashboard mengkonfirmasi tidak ada patch yang dihasilkan.
- Jira Bug dibuat dengan summary, evidence, dan OpenSpec reference yang lengkap.
- Issue key dan link Jira ditampilkan di dashboard.

### US-06 — Mengakses Riwayat Run

Sebagai QA Engineer, saya ingin membuka kembali report dari run sebelumnya, sehingga saya bisa mengaudit keputusan recovery dan memverifikasi tidak ada false green yang lolos.

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
2. Ia melihat status strip: scenario aktif, expected decision, dan target route.
3. Ia memilih scenario "Locator Drift" dan klik Run.
4. Dashboard menampilkan staged progress selama SpecHeal bekerja — mulai dari Playwright execution, evidence capture, OpenSpec loading, hingga OpenAI verdict.
5. Test gagal: selector `#pay-now` tidak ditemukan di DOM.
6. SpecHeal mengambil screenshot, error, cleaned DOM, DOM noise summary, visible page evidence, dan ranked candidate list.
7. SpecHeal memuat OpenSpec clause: payment action harus visible dan enabled saat checkout.
8. SpecHeal memanggil OpenAI — evidence + OpenSpec dikirim, verdict HEAL dikembalikan.
9. SpecHeal memvalidasi candidate selector `[data-testid="complete-payment"]` di browser: ditemukan, visible, enabled.
10. SpecHeal menghasilkan patch line dari selector yang tervalidasi dan menerapkannya ke test file.
11. SpecHeal melakukan rerun dari test file yang sudah dipatch — berhasil mencapai Payment Success.
12. Dashboard menampilkan patch diff, validation proof, dan rerun proof.
13. SpecHeal membuat Jira Task — QA Engineer melihat issue key dan link di dashboard.
14. QA Engineer menyalin patch diff dan meneruskan Jira Task ke developer untuk review. Selesai.

### 12.2 Journey: QA Engineer — Investigasi Product Bug

Konteks: QA Engineer mendapat laporan bahwa flow payment di ShopFlow berperilaku aneh. Ia menjalankan scenario Product Bug untuk memverifikasi.

1. QA Engineer membuka dashboard SpecHeal.
2. Ia memilih scenario "Product Bug" dan klik Run.
3. SpecHeal menjalankan Playwright test — gagal karena tidak ada payment action yang tersedia.
4. SpecHeal mengambil evidence: screenshot, error, dan DOM yang menunjukkan tidak ada elemen payment.
5. SpecHeal memuat OpenSpec clause: payment completion adalah behavior wajib dari ShopFlow.
6. SpecHeal memanggil OpenAI — mendapat verdict PRODUCT BUG.
7. SpecHeal mengkonfirmasi: tidak ada recovery yang aman. Tidak ada patch yang dibuat.
8. SpecHeal membuat Jira Bug dengan summary, evidence, dan OpenSpec reference.
9. QA Engineer melihat verdict PRODUCT BUG dan Jira Bug key di dashboard.
10. QA Engineer menyerahkan Jira Bug ke developer untuk investigasi. Selesai.

### 12.3 Journey: QA Engineer — Audit Full Report

Konteks: QA Engineer ingin memverifikasi keputusan recovery yang dibuat sebelumnya — memastikan tidak ada false green yang lolos.

1. QA Engineer membuka dashboard dan melihat daftar recent runs.
2. Ia memilih run yang ingin diaudit dan membuka full report.
3. Ia melihat timeline lengkap: test result → evidence → OpenSpec → verdict → proof → Jira.
4. Ia membuka AI trace drawer: prompt yang dikirim ke OpenAI, raw response, token usage, dan estimasi biaya.
5. Ia membaca klausul OpenSpec yang dijadikan dasar verdict.
6. Ia menyalin ringkasan recovery untuk dokumentasi tim.
7. Ia membuka link Jira issue untuk melihat status tindak lanjut.

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

- Pengguna dapat memilih tepat satu scenario sebelum run.
- Scenario terpilih terlihat jelas secara visual.
- Setiap scenario menentukan target state ShopFlow yang berbeda.

### FR-003 Runtime Test Execution

SpecHeal harus menjalankan Playwright test saat pengguna memulai run.

Acceptance criteria:

- Playwright membuka ShopFlow dengan target URL yang sesuai scenario.
- Test menjalankan action dengan selector awal yang telah ditentukan.
- Result menyimpan: status pass/fail, selector, target URL, test name, step name, error, dan durasi.

### FR-004 Failure Evidence Capture

Jika test gagal, SpecHeal harus mengambil bukti kegagalan secara otomatis.

Acceptance criteria:

- Evidence mencakup: error message, screenshot (base64), failed selector, dan target URL.
- Evidence mencakup: raw DOM length, cleaned DOM, dan cleaned DOM length.
- Evidence mencakup DOM noise summary — ringkasan tag dan atribut yang dihapus saat cleaning.
- Evidence mencakup visible page evidence: judul halaman, URL, teks body yang terlihat, teks payment section jika ada, pesan error jika ada, jumlah candidate valid, dan catatan relevan (misalnya kondisi zero-candidate).
- Evidence mencakup ranked candidate list.
- Evidence tersimpan dan dapat ditampilkan di dashboard serta full report.

### FR-005 DOM Cleaning and Masking

SpecHeal harus membersihkan DOM sebelum dikirim ke OpenAI.

Acceptance criteria:

- Menghapus noise: `head`, `script`, `style`, `meta`, `link`, `noscript`, komentar HTML, SVG, iframe, canvas, class, inline style, dan atribut framework.
- Masking email dan nilai sensitif dalam input.
- Menyimpan raw DOM length dan cleaned DOM length untuk perbandingan.
- Jika cleaned DOM melebihi batas prompt, di-truncate dengan marker eksplisit.

### FR-006 Candidate Selector Extraction

SpecHeal harus mengekstrak candidate element yang relevan dan menjelaskan alasan ranking-nya.

Acceptance criteria:

- Candidate diambil dari body — bukan dari head atau metadata.
- Candidate harus visible, enabled, dan interaktif.
- Setiap candidate menyertakan: selector utama, jenis selector, teks terlihat, aria-label, dan atribut identifikasi lainnya (testid, id, name, role, placeholder, title).
- Setiap candidate menyertakan stable locator suggestions — alternatif selector yang lebih stabil (testid, data-test, aria-label, dll.).
- Setiap candidate menyertakan konteks elemen: label terdekat, konteks container, dan konteks baris jika tersedia.
- Setiap candidate memiliki skor ranking dan breakdown sinyal ranking yang menjelaskan alasan posisinya.
- Kondisi zero-candidate harus tercatat secara eksplisit di evidence.

### FR-007 OpenSpec Guardrail

SpecHeal harus menggunakan OpenSpec sebagai source of truth untuk semua verdict.

Acceptance criteria:

- Prompt OpenAI menyertakan OpenSpec clause yang relevan untuk scenario.
- OpenSpec mendefinisikan behavior — bukan selector implementasi.
- `HEAL` hanya valid jika behavior produk tetap memenuhi OpenSpec.
- OpenSpec clause ditampilkan di report sebagai referensi verdict.

### FR-008 Live OpenAI Verdict

SpecHeal harus memanggil live OpenAI API untuk menghasilkan verdict terstruktur.

Acceptance criteria:

- OpenAI dipanggil untuk setiap failed run yang membutuhkan recovery analysis.
- Prompt menyertakan: error Playwright, visible page evidence, DOM cleaning metadata, kandidat yang sudah di-ranked, dan OpenSpec clause.
- Response harus structured dan parseable (mendukung HEAL, PRODUCT BUG, SPEC OUTDATED).
- Dashboard menampilkan model, prompt, raw response, dan parsed response.
- Jika OpenAI gagal, run menampilkan error state yang jelas dengan opsi retry.

### FR-009 Candidate Browser Validation

Jika verdict HEAL, SpecHeal harus memvalidasi candidate selector langsung di browser.

Acceptance criteria:

- Candidate selector harus match tepat satu elemen.
- Elemen harus visible dan enabled saat validasi.
- Elemen harus dapat menerima click.
- Patch tidak boleh ditandai aman jika validasi gagal.

### FR-010 Rerun Proof

Jika candidate validation berhasil, SpecHeal harus melakukan rerun sebagai bukti HEAL.

Acceptance criteria:

- Rerun menggunakan candidate selector dan scenario yang sama.
- Rerun harus mencapai Payment Success untuk ditandai passed.
- Patch hanya ditandai aman jika rerun passed.

### FR-011 Patch Application and Preview

Untuk verdict HEAL, SpecHeal harus menerapkan patch locator ke test file secara terkontrol dan menampilkan hasilnya.

Acceptance criteria:

- Patch line dihasilkan oleh SpecHeal dari selector yang sudah tervalidasi — bukan dari teks yang disarankan OpenAI.
- Jika test file sudah tidak berisi baris action asli, SpecHeal memperbaiki region tersebut sebelum menerapkan patch.
- Patch menyertakan: target file, baris lama, baris baru, applied diff, dan penjelasan perubahan.
- Patch tidak auto-commit dan tidak auto-merge.
- Patch preview ditampilkan di dashboard dan tersimpan di PostgreSQL.

### FR-012 Jira Issue Publishing

SpecHeal harus membuat Jira issue secara live untuk setiap hasil recovery yang membutuhkan tindak lanjut.

Acceptance criteria:

- Jira Task dibuat untuk verdict HEAL.
- Jira Bug dibuat untuk verdict PRODUCT BUG.
- Jira Task dibuat untuk verdict SPEC OUTDATED.
- Jira Task dibuat untuk terminal result RUN_ERROR — untuk investigasi kegagalan operasional.
- Payload mencakup: summary, description (ADF), issue type, labels, verdict, evidence, OpenSpec reference, dan proof.
- Dashboard menampilkan issue key dan URL jika berhasil, atau error state jika gagal.
- Run tetap tersimpan di PostgreSQL meskipun Jira publish gagal.

### FR-013 PostgreSQL Persistence

SpecHeal harus menyimpan seluruh data run ke PostgreSQL.

Acceptance criteria:

- Menyimpan: run metadata, verdict, reason, AI trace, evidence summary, patch, validation result, dan Jira publish result.
- Menyediakan endpoint recent runs untuk dashboard.
- Menyediakan endpoint full report by run ID.

### FR-014 AI Cost Transparency

SpecHeal harus menampilkan rincian penggunaan token dan estimasi biaya setiap kali OpenAI dipanggil.

Acceptance criteria:

- AI trace menampilkan prompt tokens, cached prompt tokens (jika tersedia dari API), completion tokens, dan total tokens.
- Estimasi biaya ditampilkan per komponen: input, cached input, dan output, beserta total dalam USD.
- Sumber harga ditampilkan secara eksplisit, disertai keterangan bahwa nilai ini adalah estimasi.
- Jika usage metadata tidak tersedia dari OpenAI, bagian biaya tidak ditampilkan.

### FR-015 Explainable Candidate Ranking

SpecHeal harus menampilkan reasoning di balik ranking setiap candidate selector.

Acceptance criteria:

- Evidence panel menampilkan skor, jenis selector, sinyal ranking, stable locator suggestions, dan konteks elemen untuk setiap candidate.
- Candidate yang dipilih AI ditampilkan beserta alasan ranking-nya.
- Jika tidak ada candidate yang ditemukan, evidence panel menjelaskan secara eksplisit bahwa healing tidak aman dilakukan.

### FR-016 Copy-ready Recovery Handoff

SpecHeal harus menyediakan blok teks yang siap disalin untuk setiap output recovery.

Acceptance criteria:

- Jika run memiliki output keputusan, tersedia ringkasan recovery yang siap disalin — berisi judul, rangkuman, tindakan yang direkomendasikan, evidence, dan catatan keamanan.
- Jika run memiliki patch HEAL, tersedia blok diff yang siap disalin.
- Jika run memiliki hasil Jira publish, tersedia konteks Jira yang siap disalin.

---

## 14. Integration Requirements

### 14.1 OpenAI

OpenAI adalah core verdict engine. Prompt harus menyertakan konteks yang cukup agar verdict yang dihasilkan dapat dipercaya dan diaudit.

Komponen prompt wajib:

- test name dan step name,
- failed selector dan Playwright error message,
- visible page evidence dan DOM cleaning metadata,
- ranked candidate elements beserta stable locators dan sinyal ranking,
- OpenSpec clause yang relevan,
- expected output schema (verdict, reason, confidence, candidate selector).

Konfigurasi:

- Model dikonfigurasi via environment variable `OPENAI_MODEL`.
- API key via `OPENAI_API_KEY` — server-side only.

### 14.2 Jira

Jira digunakan sebagai workflow output — bukan sekadar notifikasi, melainkan issue yang dapat langsung ditindaklanjuti.

| Verdict | Issue Type | Tindak Lanjut |
| --- | --- | --- |
| `HEAL` | Task | Review dan apply patch locator ke test file |
| `PRODUCT BUG` | Bug | Investigasi dan perbaiki product regression |
| `SPEC OUTDATED` | Task | Perbarui test atau spec mapping |
| `RUN_ERROR` | Task | Investigasi kegagalan operasional SpecHeal runtime |
| `NO_HEAL_NEEDED` | — | Tidak wajib membuat issue |

Konfigurasi:

```env
JIRA_SITE_URL=https://<team>.atlassian.net
JIRA_USER_EMAIL=<email akun Jira>
JIRA_API_TOKEN=<API token dari Atlassian>
JIRA_PROJECT_KEY=<project key target>
JIRA_TASK_ISSUE_TYPE=Task
JIRA_BUG_ISSUE_TYPE=Bug
```

### 14.3 PostgreSQL

PostgreSQL menyimpan seluruh artifact recovery untuk audit trail dan reporting:

- run history dengan metadata lengkap,
- AI trace: prompt, response, token usage, cached tokens, estimasi biaya, durasi,
- evidence: screenshot (base64), DOM, visible evidence, candidates,
- patch preview dan applied diff,
- validation result dan rerun result,
- Jira publish result: status, issue key, issue URL, error.

### 14.4 Kubernetes

- Dashboard dan API sebagai satu container image.
- Playwright runtime dengan browser dependencies.
- PostgreSQL sebagai StatefulSet atau managed service.
- Secret untuk OpenAI key, Jira token, dan database URL.
- Service dan Ingress untuk membuka dashboard ke publik.
- API route mendukung private-network preflight headers untuk kompatibilitas browser di lingkungan deployed.

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
- `failedSelector`
- `targetUrl`
- `screenshot` (base64)
- `rawDomLength`
- `cleanedDomLength`
- `cleanedDom`
- `domNoiseSummary` — list tag dan atribut yang dihapus saat DOM cleaning
- `visibleText`
- `visibleEvidence` — objek terstruktur: pageTitle, pageUrl, bodyText, paymentSectionText, errorText, validCandidateCount, notes
- `candidates` — list candidate dengan scoring, sinyal ranking, stable locators, dan konteks

### 15.3 AI Trace

- `runId`
- `model`
- `systemPrompt`
- `userPrompt`
- `rawResponse`
- `parsedResponse`
- `promptTokens`
- `cachedPromptTokens`
- `completionTokens`
- `totalTokens`
- `estimatedCostUsd`
- `costBreakdown` — rincian: inputCostUsd, cachedInputCostUsd, outputCostUsd, rates, pricingSource
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
- `appliedDiff`
- `explanation`

### 15.6 Rerun Result

- `runId`
- `passed`
- `selector`
- `expectedText`
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

SpecHeal harus terasa seperti alat kerja engineering — bukan landing page, bukan chatbot, bukan form kosong.

Prinsip:

- Halaman pertama langsung menunjukkan project, scenario, dan action yang bisa dilakukan.
- Scenario picker harus dapat dipahami tanpa membaca instruksi.
- Verdict harus terlihat jelas dengan perbedaan visual yang kuat: warna, ikon, dan label.
- Evidence ringkas di tampilan utama; detail teknis tersedia di drawer atau full report.
- OpenSpec ditampilkan sebagai source of truth yang tidak bisa diubah dari dashboard.
- Jira status ditampilkan sebagai tahap akhir workflow ketika run membutuhkan tindak lanjut.

Elemen UX wajib:

- **Demo status strip** — ditampilkan di atas dashboard, berisi scenario yang dipilih, expected decision, target route, dan run state saat ini.
- **Staged recovery progress** — selama run berlangsung, dashboard menampilkan kemajuan recovery secara bertahap (Playwright → evidence → OpenSpec → OpenAI → validation → rerun → Jira) sebelum terminal result tiba.
- **Duplicate run prevention** — tombol Run dinonaktifkan selama run masih aktif.
- **AI trace drawer** — AI trace dibuka sebagai drawer atau modal dengan konten bertab (summary, prompt, raw response, parsed response, konteks validation), bukan panel inline yang memenuhi layar.
- **Copy-ready blocks** — patch diff, output summary, dan konteks Jira dapat disalin langsung dari report.
- **ShopFlow interaction feedback** — ShopFlow menampilkan loading state saat checkout dibuka, dan payment-processing feedback saat payment action diklik.

Layout utama:

- top bar: brand, project, status koneksi,
- status strip: scenario aktif, run state, expected decision,
- control panel: scenario picker dan tombol Run,
- report panel: timeline run dan staged progress,
- evidence panel: screenshot, candidate list, patch, output, Jira status,
- trace drawer: prompt, raw output, token usage, estimasi biaya, detail validasi,
- full report page: audit lengkap per run.

---

## 17. Non-Functional Requirements

### 17.1 Reliability

- Kegagalan panggilan OpenAI tidak boleh membuat UI blank — harus ada error state yang jelas.
- Kegagalan Jira publish tidak boleh menghapus report — run tetap tersimpan.
- Run status harus selalu terdefinisi: pending, running, completed, atau failed.
- Dashboard harus dapat di-reload tanpa kehilangan data run sebelumnya.

### 17.2 Security

- OpenAI API key, Jira token, dan database URL hanya tersedia di sisi server.
- Secret disimpan sebagai environment variable atau Kubernetes Secret — tidak di-hardcode.
- Token tidak boleh muncul di log client atau response API publik.
- DOM evidence harus melalui masking data sensitif sebelum dikirim ke OpenAI atau disimpan.

### 17.3 Performance

- Dashboard initial load: di bawah 3 detik pada koneksi standar.
- Polling run status: interval cukup cepat untuk demo (disarankan di bawah 3 detik per poll).
- Operasi yang berjalan lama (Playwright, OpenAI, Jira) harus memiliki loading state yang terlihat.

### 17.4 Observability

- Setiap run menyimpan timestamps: `createdAt` dan `updatedAt`.
- Error state tersimpan di PostgreSQL dan ditampilkan di dashboard.
- Token usage, cached tokens, durasi AI, dan estimasi biaya ditampilkan di AI trace jika tersedia.

### 17.5 Usability

- QA Engineer dapat menjalankan scenario tanpa membaca instruksi panjang — UI harus self-explanatory.
- Verdict harus terlihat jelas dengan perbedaan visual yang kuat.
- Developer dapat membuka full report untuk audit teknis tanpa navigasi lebih dari 2 langkah.

### 17.6 Browser Compatibility

- API route harus merespons private-network preflight request (`OPTIONS`) dengan header yang sesuai agar dashboard dapat memanggil API dari browser di lingkungan deployed.

---

## 18. Success Metrics

MVP dianggap berhasil jika:

1. Dashboard dapat dibuka dari deployment Kubernetes.
2. Scenario Locator Drift berjalan end-to-end.
3. Scenario Product Bug berjalan end-to-end.
4. OpenAI benar-benar dipanggil pada setiap failed run.
5. OpenSpec clause terlihat di prompt dan report.
6. `HEAL` menghasilkan validation proof, patch dari selector tervalidasi, dan rerun proof.
7. `PRODUCT BUG` tidak menghasilkan patch.
8. Jira Task berhasil dibuat untuk `HEAL`.
9. Jira Bug berhasil dibuat untuk `PRODUCT BUG`.
10. Token usage dan estimasi biaya tampil di AI trace.
11. PostgreSQL menyimpan run history.
12. Full report dapat dibuka dan diaudit.
13. Error state OpenAI dan Jira ditangani dengan jelas.

---

## 19. Release Criteria

MVP siap demo jika:

- semua environment variable wajib tersedia,
- dashboard dapat diakses secara publik,
- OpenAI call berhasil minimal pada scenario Locator Drift dan Product Bug,
- Jira issue berhasil dibuat dari dashboard,
- PostgreSQL menyimpan run,
- Kubernetes deployment stabil,
- demo dapat dilakukan dalam 5 menit.

---

## 20. Risks and Mitigations

| Risiko | Dampak | Prob. | Mitigasi |
| --- | --- | --- | --- |
| OpenAI API gagal saat demo | Tinggi | Rendah | Tampilkan error jelas + retry button. Siapkan API key cadangan. Validasi key sebelum demo. |
| Jira credential belum dikonfigurasi | Sedang | Sedang | Buat config health check di dashboard. Validasi project key saat startup. Siapkan akun Jira demo. |
| Jira issue type berbeda dari konfigurasi | Sedang | Sedang | Gunakan configurable issue type via env variable. Test create issue sehari sebelum demo. |
| Playwright gagal berjalan di container | Tinggi | Sedang | Gunakan base image resmi Playwright dengan browser dependencies. Test di environment yang sama dengan deployment. |
| Scope melebar saat development | Tinggi | Tinggi | Fokus pada Locator Drift dan Product Bug. Fitur lain masuk Future Roadmap. |
| AI verdict tidak akurat | Sedang | Rendah | Wajib ada browser validation dan rerun proof. Verdict AI tidak final tanpa bukti. |
| OpenSpec terlalu ambigu | Tinggi | Sedang | Tulis OpenSpec behavior-first dan selector-agnostic. Review sebelum demo. |

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

Setelah MVP hackathon selesai, berikut prioritas pengembangan lanjutan:

**Short-Term**

- Demo penuh untuk SPEC OUTDATED dengan scenario nyata.
- Lampiran screenshot langsung ke Jira issue.
- CI integration untuk membaca failed test run dari pipeline nyata — bukan seeded scenario.

**Medium-Term**

- GitHub PR patch suggestion — tidak hanya preview, tapi bisa membuka PR langsung.
- Multi-project OpenSpec mapping untuk lebih dari satu codebase.
- Dukungan Cypress dan Selenium sebagai alternatif Playwright.
- Trend dashboard: visualisasi selector drift over time per project.

**Long-Term**

- Approval policy engine untuk auto-PR dengan pembatas team-level.
- Multi-tenant SaaS dengan workspace isolation per tim.
- Enterprise analytics: MTTR dari CI failure, false-green rate, heal success rate.

---

## 23. Glossary

| Istilah | Definisi |
| --- | --- |
| OpenSpec | Spesifikasi behavior produk yang menjadi source of truth untuk semua verdict. Ditulis behavior-first dan selector-agnostic. |
| Playwright | Framework browser automation test yang digunakan sebagai runtime execution SpecHeal. |
| Selector drift | Kondisi di mana selector test gagal karena UI berubah, tetapi behavior produk sebenarnya masih benar. |
| False green | Kondisi di mana test pass tetapi behavior produk sebenarnya melanggar requirement — akibat self-healing yang tidak tervalidasi. |
| HEAL | Verdict bahwa test gagal karena selector drift dan aman diperbaiki dengan patch locator yang tervalidasi. |
| PRODUCT BUG | Verdict bahwa produk melanggar requirement OpenSpec — tidak ada recovery yang aman, output adalah Jira Bug. |
| SPEC OUTDATED | Verdict bahwa test atau spec mapping perlu diperbarui karena flow produk berubah secara sengaja. |
| NO_HEAL_NEEDED | Verdict bahwa test berjalan sukses dan tidak membutuhkan recovery. |
| RUN_ERROR | Terminal state operasional ketika run gagal sebelum verdict recovery dihasilkan — akibat Playwright crash, OpenAI tidak terkonfigurasi, atau kegagalan sistem lainnya. Output: Jira Task. |
| Evidence capture | Proses pengambilan screenshot, DOM, visible evidence, dan candidate elements saat test gagal. |
| Candidate selector | Element DOM yang diusulkan sebagai pengganti selector yang gagal. |
| Stable locator | Selector alternatif yang lebih tahan terhadap perubahan UI — biasanya berbasis data-testid, aria-label, atau id. |
| Rerun proof | Bukti bahwa test berhasil dijalankan ulang dari test file yang sudah dipatch dan mencapai expected result. |
| AI trace | Log lengkap interaksi dengan OpenAI: prompt, raw response, parsed response, token usage, estimasi biaya, durasi. |
| Jira publisher | Komponen SpecHeal yang bertanggung jawab membuat dan mempublikasikan Jira issue dari hasil recovery. |
| ShopFlow Checkout | Mini checkout app yang menjadi seeded system under test untuk demo SpecHeal. |
| Copy-ready handoff | Blok teks yang dapat langsung disalin dari report — berisi patch diff, ringkasan recovery, atau konteks Jira — untuk memudahkan handoff ke developer. |
