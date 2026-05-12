# Product Requirements Document: SpecHeal

Status: Draft Planning  
Versi: 1.0  
Tim: Merge Kalau Berani  
Event: Refactory Hackathon 2026, Telkom Round  
Tanggal: 12 Mei 2026  
Target Pembaca: Judge, Mentor, Developer, dan Stakeholder Hackathon

---

## 1. Change History

| Versi | Tanggal | Penulis | Deskripsi |
|---|---|---|---|
| 1.0 | 12 Mei 2026 | Merge Kalau Berani | Dokumen awal — draft planning hackathon |

---

SpecHeal menjalankan test di browser, mengambil evidence kegagalan, membaca OpenSpec sebagai kontrak perilaku, meminta OpenAI menghasilkan verdict terstruktur, memvalidasi candidate selector di browser, menerapkan patch locator ke test file saat aman, membuktikan hasil dengan rerun, menyimpan report ke PostgreSQL, lalu mempublikasikan hasil yang membutuhkan action ke Jira.

SpecHeal adalah AI-assisted recovery cockpit untuk menangani kegagalan UI automation test berbasis Playwright. Produk ini menjawab satu pertanyaan kritis yang sering membuang jam kerja tim engineering:

> Ketika sebuah UI test gagal di CI, apakah test ini aman untuk diperbaiki — atau produk benar-benar rusak?

UI automation test sering gagal bukan karena product bug, melainkan karena selector atau DOM drift: developer merefactor button atau layout, tapi behavior produk tetap benar. Di sisi lain, self-healing yang naif justru berbahaya karena dapat menghasilkan false green — test hijau meski requirement produk sebenarnya dilanggar.

SpecHeal menyelesaikan problem ini melalui safe recovery loop yang terstruktur:

```text
Playwright failure
-> evidence capture
-> OpenSpec requirement
-> OpenAI verdict
-> browser validation
-> controlled test-file patch
-> rerun proof
-> Jira action
```

**SpecHeal bukan sekadar membuat test hijau. SpecHeal membuat recovery test bisa dipercaya.**

---

## 3. Problem Statement

### 3.1 Automation Testing sebagai Fondasi Development Modern

Di era software development modern, automation testing bukan lagi opsional — melainkan infrastruktur. Hampir semua perusahaan teknologi, dari startup hingga enterprise, telah mengadopsi automation testing sebagai bagian inti dari workflow development mereka.

Alasannya jelas: automation testing memungkinkan tim engineering menjalankan ribuan regression test dalam hitungan menit. Setiap kali developer push perubahan, CI pipeline otomatis memverifikasi bahwa tidak ada fitur yang rusak. Hasilnya:

- **Rilis lebih cepat** — Regression testing yang dulu butuh berhari-hari kini selesai dalam menit. Tim bisa ship fitur dengan confidence tinggi.
- **Deteksi bug lebih awal** — Bug ditemukan saat development, bukan setelah production. Biaya fix jauh lebih rendah.
- **Tim lebih fokus** — Engineer tidak perlu manual testing berulang. Energi dialihkan ke inovasi, bukan regresi.

Singkatnya: automation testing adalah enabler utama engineering velocity. Semakin andal test suite-nya, semakin cepat dan aman tim bisa bergerak.

### 3.2 Kelemahan Tersembunyi: UI Automation Sangat Rapuh

Namun ada satu layer automation yang secara inheren rapuh: UI automation test. Berbeda dengan unit test atau API test yang menguji kontrak yang stabil, UI test bergantung pada detail implementasi tampilan yang berubah setiap hari:

- Selector CSS atau ID elemen HTML
- Atribut `data-testid` yang diubah tim frontend
- Struktur DOM yang direstrukturisasi saat refactor komponen
- Teks tombol atau label yang disesuaikan untuk A/B test
- Posisi elemen yang bergeser karena perubahan layout

Ketika salah satu dari ini berubah — meski behavior produk untuk user tetap sama persis — UI test langsung gagal. CI pipeline berubah menjadi merah. Dan tim tidak bisa langsung tahu: apakah ini test yang perlu diperbarui, atau produk yang benar-benar rusak?

Contoh nyata yang terjadi setiap hari di tim engineering:

```ts
// Test yang berjalan selama berbulan-bulan:
await page.click("#pay-now");
```

Tim frontend melakukan refactor komponen payment — perbaikan yang wajar, behavior checkout tidak berubah sama sekali. Tapi markup-nya berubah:

```html
<!-- DOM setelah refactor (behavior sama, selector berbeda): -->
<button data-testid="complete-payment">Pay Now</button>
```

Hasilnya: dari sisi user, checkout masih berjalan normal. Dari sisi CI, pipeline merah. Sprint terganggu. Engineer dialihkan dari fitur baru untuk investigasi — hanya untuk menemukan bahwa satu ID berubah.

### 3.3 Solusi yang Ada Hari Ini: Self-Healing — Tapi Berbahaya

Industri sudah menyadari masalah ini. Lahirlah konsep self-healing test: tools yang secara otomatis mendeteksi selector yang gagal dan mencari penggantinya agar test kembali hijau.

Secara teori ini menarik. Tapi dalam praktik, self-healing generik menciptakan masalah yang jauh lebih berbahaya karena tiga pertanyaan kritis tidak pernah terjawab:

| # | Pertanyaan yang tidak terjawab | Mengapa ini masalah serius |
|---|---|---|
| 1 | Apakah produk benar-benar masih berfungsi sesuai requirement? | Self-healing hanya melihat apakah test bisa pass — bukan apakah behavior produk memenuhi spec. Jika payment button hilang tapi ada elemen lain yang bisa diklik, test bisa "hijau" meski checkout sudah broken. |
| 2 | Apakah selector baru benar-benar mewakili intent test yang asli? | AI yang memilih selector pengganti tidak tahu konteks bisnis dari test. Ia hanya mencari elemen yang "mirip" — bukan elemen yang mewakili requirement yang sama. |
| 3 | Siapa yang bertanggung jawab jika heal-nya salah? | Tidak ada audit trail. Tidak ada keputusan yang terdokumentasi. Jika bug lolos ke production, tidak ada yang tahu kapan dan mengapa test di-heal. |

Inilah yang disebut **false green**: test pass, CI hijau — tapi requirement produk sebenarnya dilanggar. Dan ini jauh lebih berbahaya dari test yang merah, karena tim tidak tahu ada yang salah.

> **Paradoks self-healing:** Self-healing yang asal membuat test hijau tidak menyelesaikan masalah — ia menyembunyikannya. Tim kehilangan trust terhadap CI suite justru karena CI-nya tampak terlalu "baik-baik saja".

### 3.4 Dampak Bisnis

Kombinasi dari locator drift dan self-healing yang tidak tervalidasi menghasilkan dampak nyata pada engineering productivity:

- **Waktu investigasi test failure** — 30–60 menit per insiden, per engineer, hanya untuk membedakan "test perlu diperbarui" dari "produk rusak".
- **False confidence dari self-healing naif** — Product bug tidak terdeteksi di regression, lolos ke production.
- **Erosi kepercayaan terhadap CI** — Engineer mulai mengabaikan test failure — spiral ke kualitas yang lebih buruk dari waktu ke waktu.
- **Tidak ada audit trail** — Tidak ada dokumentasi keputusan "test ini di-heal" — tidak bisa diaudit, tidak bisa dipertanggungjawabkan.
- **Velocity melambat** — Tim yang seharusnya fokus pada fitur baru terjebak di maintenance test yang mestinya bisa diotomasi dengan aman.

---

## 4. Product Positioning

### 4.1 Kategori

```text
AI-assisted UI Test Recovery Cockpit
```

SpecHeal berada di persimpangan antara test automation, CI failure triage, AI developer productivity, dan QA workflow automation.

### 4.2 Bukan SpecHeal

- Pengganti Playwright atau framework testing lainnya
- Generic QA chatbot yang menjawab pertanyaan umum
- Generic website crawler atau scraper
- Tool yang otomatis membuat semua test gagal menjadi pass
- Jira ticket generator tanpa konteks teknis

### 4.3 Pembeda Utama

SpecHeal membedakan diri dari solusi self-healing generik melalui empat lapis:

| Layer | Fungsi |
|---|---|
| **AI Proposes** | OpenAI menganalisis evidence dan mengusulkan candidate selector — bukan asal ganti, tapi berdasarkan konteks DOM yang bersih dan terstruktur. |
| **OpenSpec Guards** | Setiap verdict divalidasi terhadap OpenSpec sebagai source of truth behavior. Jika behavior wajib hilang, HEAL tidak diizinkan. |
| **Browser Validates** | Candidate selector divalidasi langsung di browser: harus match satu elemen, visible, enabled, dan dapat menerima click. |
| **Jira Tracks** | Setiap recovery action — baik patch maupun bug — dipublikasikan ke Jira dengan evidence lengkap untuk audit trail. |

---

## 5. Goals & Success Metrics

### 5.1 Product Goals

1. Menyediakan dashboard untuk menjalankan scenario recovery UI test.
2. Menggunakan live OpenAI untuk menganalisis failure evidence dan OpenSpec.
3. Membedakan `HEAL`, `PRODUCT BUG`, `SPEC OUTDATED`, dan `NO_HEAL_NEEDED`.
4. Membuktikan `HEAL` melalui browser validation, controlled test-file patch, dan rerun proof.
5. Membuat Jira issue secara live untuk hasil recovery yang membutuhkan action.
6. Menyimpan run history dan audit trail ke PostgreSQL.
7. Menyediakan full report yang bisa diaudit oleh judge, mentor, dan developer.
8. Menyediakan deployment Kubernetes untuk seluruh runtime MVP.

### 5.2 Success Metrics (KPIs)

| Metrik | Target MVP | Cara Mengukur |
|---|---|---|
| End-to-end recovery berhasil dijalankan | 100% scenario HEAL & PRODUCT BUG selesai tanpa error fatal | Demo live di hadapan judge |
| Verdict accuracy (HEAL vs PRODUCT BUG) | 2/2 scenario seeded menghasilkan verdict yang benar | Run seeded scenario, compare verdict output |
| Waktu dari klik Run ke verdict tampil | < 60 detik untuk seeded scenario | Timestamp run start vs verdict rendered |
| Jira issue berhasil dibuat | 100% dari run yang menghasilkan HEAL atau PRODUCT BUG | Jira API response 201 + issue key tampil di dashboard |
| PostgreSQL persistence | Semua run tersimpan dan dapat dibuka kembali | Reload dashboard, cek recent runs |
| Dashboard initial load | < 3 detik di koneksi standar | Browser DevTools network panel |
| Error state ditangani jujur | Tidak ada UI blank saat OpenAI/Jira gagal | Simulasi API failure, verifikasi error state muncul |

### 5.3 Demo Goals

Demo harus membuktikan secara live — bukan slide:

- Locator Drift dapat di-heal secara aman dengan bukti rerun yang berhasil mencapai `Payment Success`.
- Product Bug tidak dipaksa menjadi test hijau — output yang benar adalah Jira Bug, bukan patch.
- OpenAI benar-benar dipanggil dan trace-nya terlihat di dashboard.
- OpenSpec benar-benar dipakai sebagai guardrail — klausulnya tampil di report.
- Jira benar-benar menerima issue dengan summary, evidence, dan OpenSpec reference.

---

## 6. Target User & Persona

SpecHeal dirancang untuk satu primary user: **QA Engineer**. Mereka adalah satu-satunya persona yang berinteraksi langsung dengan SpecHeal dashboard dari awal hingga akhir recovery workflow.

Frontend Engineer dan Engineering Lead menerima output SpecHeal melalui Jira — bukan melalui dashboard. Mereka adalah recipient, bukan user produk.

### 6.1 QA Engineer

| | |
|---|---|
| **Role** | Quality Assurance Engineer / SDET / Automation Engineer |
| **Konteks kerja** | Bertanggung jawab atas kesehatan CI pipeline dan kualitas regression suite. Setiap kali ada test failure, mereka yang pertama kali menginvestigasi. |
| **Tools sehari-hari** | CI/CD platform (Jenkins, GitHub Actions, GitLab CI), Playwright/test framework, Jira, browser DevTools |

**Pain Points:**
- Ketika CI merah, tidak bisa langsung tahu apakah ini test yang perlu diperbarui atau produk yang benar-benar broken — harus investigasi manual yang memakan waktu.
- Self-healing tools yang ada tidak bisa dipercaya: tidak ada jaminan selector pengganti benar-benar mewakili requirement, tidak ada audit trail dari keputusan heal.
- Evidence kegagalan tersebar di berbagai tempat: screenshot di CI, error di log, DOM harus di-inspect sendiri di browser.
- Tidak ada cara cepat untuk membuktikan bahwa sebuah test fix aman — harus manual rerun dan verifikasi behavior satu per satu.
- Jika ternyata product bug, sulit membuat laporan yang cukup informatif untuk diserahkan ke developer tanpa investigasi tambahan.

**Kebutuhan:**
- Satu tempat untuk menjalankan recovery analysis tanpa perlu membuka terminal, inspect DOM, atau cek CI log secara manual.
- Verdict yang jelas dan bisa dipertanggungjawabkan: HEAL atau PRODUCT BUG, bukan sekadar "test bisa pass lagi".
- Evidence lengkap yang sudah dikumpulkan otomatis: screenshot, error message, cleaned DOM, dan candidate selector.
- Bukti bahwa recovery aman: candidate selector tervalidasi di browser, bukan hanya usulan AI.
- Rerun proof sebagai konfirmasi final sebelum patch dianggap safe.
- Output yang langsung actionable ke Jira — baik Jira Task untuk patch review maupun Jira Bug untuk product regression.
- Audit trail yang bisa dibuka kembali kapan saja untuk setiap keputusan recovery.

**Success Signal:** QA Engineer dapat membedakan locator drift dari product regression dalam < 5 menit — tanpa membuka browser inspector, tanpa manual rerun, tanpa menulis Jira ticket dari nol. Semua keputusan recovery terdokumentasi dan bisa diaudit.

**Apa yang TIDAK dikerjakan QA Engineer di SpecHeal:**
- Tidak perlu tahu cara kerja internal OpenAI atau OpenSpec — cukup baca verdict dan evidence-nya.
- Tidak perlu apply patch sendiri — patch preview tersedia untuk diserahkan ke developer via Jira.
- Tidak perlu konfigurasi Jira atau environment — semua credential dikelola server-side.

- melihat produk yang benar-benar berjalan,
- memahami problem dengan cepat,
- melihat AI dipakai dengan guardrail,
- melihat output actionable masuk ke Jira,
- menilai end-to-end execution.

## 7. MVP Scope

### 7.1 Hackathon Context

Refactory Hackathon 2026 mengangkat tema Engineering Productivity x AI. SpecHeal memenuhi semua fondasi wajib:

| Fondasi Wajib | Implementasi di SpecHeal |
|---|---|
| OpenSpec | Dipakai sebagai source of truth untuk semua verdict — bukan hanya dokumentasi |
| LLM / AI | OpenAI sebagai core verdict engine dengan structured response dan audit trace |
| Kubernetes | Seluruh runtime MVP di-deploy ke Kubernetes VPS |
| PostgreSQL | Menyimpan run history, AI trace, evidence, patch, dan Jira publish result |

### 7.2 In Scope

- Dashboard SpecHeal sebagai cockpit utama
- Seeded demo app: ShopFlow Checkout (`cart → checkout → pay → Payment Success`)
- Scenario picker: Healthy Flow, Locator Drift, Product Bug
- Runtime Playwright execution dengan failure evidence capture
- DOM cleaning dan sensitive data masking
- Candidate selector extraction dan ranking
- OpenSpec requirement loading sebagai guardrail
- Live OpenAI verdict dengan structured response
- Browser candidate validation (visible, enabled, clickable)
- Rerun proof sebagai bukti HEAL aman
- Patch preview untuk verdict `HEAL`
- Live Jira issue publishing (Task untuk HEAL, Bug untuk PRODUCT BUG)
- PostgreSQL persistence untuk run history dan audit trail
- Full report per run dengan AI trace dan evidence
- Kubernetes deployment untuk seluruh runtime

### 7.3 Out of Scope (MVP)

- Testing terhadap website arbitrary (bukan ShopFlow)
- Auto-commit atau auto-merge patch ke repository
- GitHub PR automation
- Authentication dan multi-tenant workspace
- Support Cypress, Selenium, atau framework lain
- Analytics historis skala besar
- Demo utama untuk `SPEC OUTDATED` (didukung dalam schema, bukan alur demo utama)
- Screenshot attachment langsung ke Jira

---

## 8. Supported Verdicts

### 8.1 NO_HEAL_NEEDED

**Makna:** Test berjalan sukses dengan selector saat ini. Tidak ada failure yang perlu di-recover.

**Output:** Report sukses. Tidak wajib membuat Jira issue.

### 8.2 HEAL

**Makna:** Test gagal karena locator/DOM drift, namun behavior produk tetap sesuai OpenSpec. Candidate selector baru valid dan rerun berhasil mencapai `Payment Success`.

**Output:** Patch preview + validation proof + rerun proof + Jira Task untuk review/apply patch.

### 8.3 PRODUCT BUG

**Makna:** Behavior yang diwajibkan OpenSpec hilang atau rusak. Tidak ada recovery yang aman. Test tidak boleh dipaksa hijau.

**Output:** Jira Bug + evidence. Tidak ada patch.

### 8.4 SPEC OUTDATED

**Makna:** Test lama tidak sesuai dengan flow/requirement terbaru. Perbaikan tidak cukup dengan ganti selector — test atau spec mapping perlu diperbarui.

- lead dapat melihat audit trail untuk setiap run dan Jira output untuk hasil yang membutuhkan action.

> Catatan: `SPEC OUTDATED` didukung dalam desain dan schema, namun bukan alur demo utama MVP.

---

## 9. User Stories

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
- Controlled test-file patch application untuk `HEAL`.
- Rerun proof dari test file yang sudah dipatch.
- Applied patch preview untuk `HEAL`.
- Jira issue publishing untuk `HEAL` dan `PRODUCT BUG`.
- PostgreSQL persistence.
- Recent runs dan full report.
- Kubernetes deployment.

### 9.1 Menjalankan Recovery Scenario

**US-01** — Sebagai QA Engineer, saya ingin memilih scenario recovery dari dashboard dan menjalankannya dengan satu klik, sehingga saya dapat langsung mendapat analisis kegagalan tanpa harus setup apapun secara manual.

Acceptance Criteria:
- Dashboard menampilkan scenario picker dengan minimal 3 pilihan: Healthy Flow, Locator Drift, Product Bug.
- Tombol Run aktif setelah scenario dipilih.
- Dashboard menampilkan loading state yang informatif selama run berlangsung.
- Verdict tampil di halaman yang sama tanpa navigasi tambahan.

### 9.2 Memahami Penyebab Kegagalan

**US-02** — Sebagai QA Engineer, saya ingin melihat evidence failure secara lengkap di dashboard, sehingga saya tidak perlu membuka browser inspector, membaca CI log, atau inspect DOM secara manual.

Acceptance Criteria:
- Evidence mencakup screenshot halaman pada saat test gagal.
- Evidence mencakup failed selector, Playwright error message, dan target URL.
- Evidence mencakup cleaned DOM yang dapat dibaca — bebas dari noise script, style, dan metadata.
- Ranked candidate list ditampilkan sebagai konteks elemen yang tersedia di halaman.

### 9.3 Memverifikasi Verdict HEAL

**US-03** — Sebagai QA Engineer, saya ingin melihat bukti konkret bahwa verdict HEAL benar-benar aman, sehingga saya tidak perlu mempercayai rekomendasi AI secara blind.

Acceptance Criteria:
- Dashboard menampilkan candidate selector yang sudah divalidasi di browser.
- Hasil validasi mencakup: elemen ditemukan, visible, enabled.
- Status rerun ditampilkan: passed/failed beserta hasil akhirnya (Payment Success atau tidak).
- Patch preview menampilkan baris lama dan baris baru secara berdampingan dengan penjelasan perubahan.
- Patch tidak auto-commit — hanya preview untuk diserahkan ke developer via Jira Task.

### 9.4 Memahami Dasar Keputusan AI

**US-04** — Sebagai QA Engineer, saya ingin melihat klausul OpenSpec yang dijadikan dasar verdict, sehingga saya dapat memverifikasi bahwa keputusan recovery konsisten dengan requirement produk.

Acceptance Criteria:
- OpenSpec clause yang relevan ditampilkan di timeline run.
- OpenSpec clause mendefinisikan behavior (bukan selector implementasi).
- AI trace dapat dibuka untuk melihat prompt lengkap, raw response, dan token usage.

### 9.5 Menangani Product Bug

**US-05** — Sebagai QA Engineer, saya ingin mendapat Jira Bug yang informatif ketika verdict PRODUCT BUG, sehingga saya bisa langsung menyerahkannya ke developer tanpa perlu menulis laporan bug dari nol.

Acceptance Criteria:
- Dashboard menampilkan verdict PRODUCT BUG dengan jelas secara visual.
- Dashboard mengkonfirmasi bahwa tidak ada patch yang dihasilkan — tidak ada safe recovery.
- Jira Bug berhasil dibuat dengan summary, evidence, dan OpenSpec reference yang lengkap.
- Issue key dan link Jira ditampilkan di dashboard untuk akses langsung.

### 9.6 Mengakses Riwayat Run

**US-06** — Sebagai QA Engineer, saya ingin membuka kembali report dari run sebelumnya, sehingga saya dapat mengaudit keputusan recovery yang pernah dibuat dan memverifikasi tidak ada false green yang lolos.

Acceptance Criteria:
- Dashboard menampilkan daftar recent runs dengan status dan verdict masing-masing.
- Setiap run memiliki full report yang dapat dibuka.
- Full report menampilkan timeline lengkap: test result, evidence, OpenSpec, verdict, proof, Jira result.
- AI trace tersedia di full report untuk keperluan audit teknis.

<<<<<<< HEAD
---
=======
- applied patch preview,
- validation proof,
- rerun proof,
- Jira Task untuk review/apply patch.
>>>>>>> main

## 10. User Journeys

Semua journey ditulis dari perspektif QA Engineer sebagai primary user SpecHeal.

### 10.1 Journey: QA Engineer — Investigasi Locator Drift (HEAL)

**Konteks:** QA Engineer menerima notifikasi CI merah setelah tim frontend melakukan refactor komponen. Ia membuka SpecHeal untuk menginvestigasi.

1. QA Engineer membuka dashboard SpecHeal.
2. Ia memilih scenario "Locator Drift" dari scenario picker — sesuai dugaan bahwa ada perubahan UI.
3. Ia klik Run. Dashboard menampilkan loading state.
4. SpecHeal menjalankan Playwright test terhadap ShopFlow menggunakan selector lama (`#pay-now`).
5. Test gagal: selector tidak ditemukan di DOM.
6. SpecHeal otomatis mengambil screenshot, error, cleaned DOM, dan ranked candidate list.
7. SpecHeal memuat OpenSpec clause: payment action harus visible dan enabled saat checkout.
8. SpecHeal memanggil OpenAI — evidence + OpenSpec dikirim, verdict `HEAL` dikembalikan.
9. SpecHeal memvalidasi candidate selector `[data-testid="complete-payment"]` di browser: ditemukan, visible, enabled.
10. SpecHeal melakukan rerun dengan selector baru — berhasil mencapai `Payment Success`.
11. Dashboard menampilkan patch preview (lama vs baru), validation proof, dan rerun proof.
12. SpecHeal membuat Jira Task secara otomatis — QA Engineer melihat issue key dan link di dashboard.
13. QA Engineer menyerahkan Jira Task ke developer untuk review dan apply patch. Selesai.

### 10.2 Journey: QA Engineer — Investigasi Product Bug

**Konteks:** QA Engineer mendapat laporan bahwa flow payment di ShopFlow berperilaku aneh. Ia menjalankan scenario Product Bug untuk memverifikasi.

1. QA Engineer membuka dashboard SpecHeal.
2. Ia memilih scenario "Product Bug" dan klik Run.
3. SpecHeal menjalankan Playwright test — test gagal karena tidak ada payment action yang tersedia.
4. SpecHeal mengambil evidence: screenshot, error, dan DOM yang menunjukkan tidak ada elemen payment.
5. SpecHeal memuat OpenSpec clause: payment completion adalah behavior wajib dari ShopFlow.
6. SpecHeal memanggil OpenAI — mendapat verdict `PRODUCT BUG`.
7. SpecHeal mengkonfirmasi: tidak ada safe recovery. Tidak ada patch yang dibuat.
8. SpecHeal membuat Jira Bug dengan summary, evidence lengkap, dan OpenSpec reference.
9. QA Engineer melihat verdict `PRODUCT BUG` dan Jira Bug key di dashboard.
10. QA Engineer menyerahkan Jira Bug ke developer untuk investigasi regression. Selesai.

### 10.3 Journey: QA Engineer — Audit Full Report

**Konteks:** QA Engineer ingin memverifikasi keputusan recovery yang dibuat sebelumnya — memastikan tidak ada false green yang lolos.

1. QA Engineer membuka dashboard dan melihat daftar recent runs.
2. Ia memilih run yang ingin diaudit dan membuka full report.
3. Ia melihat timeline lengkap: test result → evidence → OpenSpec → verdict → proof → Jira.
4. Ia membuka AI trace: memeriksa prompt yang dikirim ke OpenAI, raw response, dan token usage.
5. Ia membaca klausul OpenSpec yang dijadikan dasar verdict untuk memverifikasi relevansinya.
6. Ia membuka link Jira issue dari full report untuk melihat status tindak lanjut.

---

<<<<<<< HEAD
## 11. Functional Requirements
=======
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
11. SpecHeal menerapkan patch locator ke target Playwright test file.
12. SpecHeal melakukan rerun dari test file yang sudah dipatch.
13. Rerun mencapai `Payment Success`.
14. Dashboard menampilkan applied patch preview.
15. SpecHeal membuat Jira Task.
16. Dashboard menampilkan Jira issue key dan link.

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
>>>>>>> main

### FR-001 Dashboard Active Project

SpecHeal harus menampilkan dashboard utama untuk project ShopFlow Checkout.

Acceptance Criteria:
- Menampilkan nama project, status OpenSpec, dan status Playwright suite.
- Menampilkan status koneksi Jira dan OpenAI.
- Menyediakan CTA run scenario yang aktif setelah scenario dipilih.

### FR-002 Scenario Picker

Dashboard harus menyediakan tiga scenario: Healthy Flow, Locator Drift, dan Product Bug.

Acceptance Criteria:
- User dapat memilih tepat satu scenario sebelum run.
- Scenario terpilih terlihat jelas secara visual.
- Tiap scenario menentukan target state ShopFlow yang berbeda.

### FR-003 Runtime Test Execution

SpecHeal harus menjalankan Playwright test saat user memulai run.

Acceptance Criteria:
- Playwright membuka ShopFlow dengan target URL yang sesuai scenario.
- Test menjalankan action dengan selector awal yang telah ditentukan.
- Result menyimpan: status pass/fail, selector, target URL, test name, step name, error, dan duration.

### FR-004 Failure Evidence Capture

Jika test gagal, SpecHeal harus mengambil evidence secara otomatis.

Acceptance Criteria:
- Evidence mencakup: error message, screenshot, failed selector, target URL.
- Evidence mencakup: raw DOM length, cleaned DOM, visible page evidence, ranked candidate list.
- Evidence tersimpan dan dapat ditampilkan di dashboard serta full report.

### FR-005 DOM Cleaning & Masking

SpecHeal harus membersihkan DOM sebelum dikirim ke OpenAI.

Acceptance Criteria:
- Menghapus noise: `head`, `script`, `style`, `meta`, `link`, `noscript`, comments, SVG, iframe, canvas.
- Masking email dan sensitive input values.
- Menyimpan raw DOM length dan cleaned DOM length untuk perbandingan.

### FR-006 Candidate Selector Extraction

SpecHeal harus mengekstrak candidate element yang relevan dari DOM yang sudah dibersihkan.

Acceptance Criteria:
- Candidate diambil dari body (bukan head metadata).
- Candidate click harus visible, enabled, dan interaktif.
- Candidate diberi score/ranking yang dapat dilihat di report.
- Zero-candidate state harus eksplisit tercatat di evidence.

### FR-007 OpenSpec Guardrail

SpecHeal harus menggunakan OpenSpec sebagai source of truth untuk semua verdict.

Acceptance Criteria:
- Prompt OpenAI menyertakan OpenSpec clause yang relevan untuk scenario.
- OpenSpec mendefinisikan behavior (bukan selector implementasi).
- `HEAL` hanya valid jika behavior tetap memenuhi OpenSpec.
- OpenSpec clause ditampilkan di report sebagai referensi verdict.

### FR-008 Live OpenAI Verdict

SpecHeal harus memanggil live OpenAI API untuk menghasilkan verdict terstruktur.

Acceptance Criteria:
- OpenAI dipanggil untuk setiap failed run yang membutuhkan recovery analysis.
- Response harus structured dan parseable (mendukung `HEAL`, `PRODUCT BUG`, `SPEC OUTDATED`).
- Dashboard menampilkan model, prompt, raw response, parsed response, token usage.
- Jika OpenAI gagal, run menampilkan failure state yang jujur dengan opsi retry.

<<<<<<< HEAD
### FR-009 Candidate Browser Validation
=======
- OpenAI API dipanggil ketika failed run butuh recovery analysis.
- Model default adalah `gpt-4o-mini` dan hanya dapat dioverride via server-side environment variable.
- Response harus structured dan parseable.
- Verdict mendukung `HEAL`, `PRODUCT BUG`, dan `SPEC OUTDATED`.
- Response menyertakan reason, confidence, candidate selector, patch atau bug report.
- Dashboard menampilkan model, prompt, raw response, parsed response, token usage, dan estimated cost jika tersedia.
- Jika OpenAI gagal, run menampilkan failure state yang jujur dan dapat di-retry.
>>>>>>> main

Jika verdict `HEAL`, SpecHeal harus memvalidasi candidate selector langsung di browser.

Acceptance Criteria:
- Candidate selector harus match tepat satu elemen.
- Elemen harus visible dan enabled saat validasi.
- Elemen harus dapat menerima click trial.
- Patch tidak boleh ditandai safe jika validasi gagal.

### FR-010 Rerun Proof

<<<<<<< HEAD
Jika candidate validation berhasil, SpecHeal harus melakukan rerun sebagai bukti HEAL.

Acceptance Criteria:
- Rerun menggunakan candidate selector dan scenario yang sama.
- Rerun harus mencapai `Payment Success` untuk ditandai passed.
- Patch hanya ditandai safe jika rerun passed.
=======
Jika candidate validation berhasil, SpecHeal harus menerapkan patch ke Playwright test file lalu melakukan rerun.

Acceptance criteria:

- Rerun memakai target Playwright test file yang sudah dipatch.
- Rerun memakai target scenario yang sama.
- Rerun mencapai `Payment Success`.
- Patch hanya ditandai safe jika validation, patch application, dan rerun passed.
>>>>>>> main

### FR-011 Patch Application and Preview

<<<<<<< HEAD
Untuk verdict `HEAL`, SpecHeal harus menampilkan patch preview yang actionable.

Acceptance Criteria:
- Patch mencakup: target file, baris lama, baris baru, dan penjelasan perubahan.
=======
Untuk verdict `HEAL`, SpecHeal harus menerapkan patch locator ke target Playwright test file secara controlled dan menampilkan applied patch preview.

Acceptance criteria:

- Patch mencakup target file.
- Patch mencakup old line.
- Patch mencakup new line.
- Patch mencakup explanation.
- Patch hanya mengubah locator test yang relevan.
>>>>>>> main
- Patch tidak auto-commit dan tidak auto-merge.
- Patch ditampilkan di dashboard dan tersimpan di PostgreSQL.

### FR-012 Jira Issue Publishing

SpecHeal harus membuat Jira issue secara live untuk setiap recovery result yang membutuhkan action.

Acceptance Criteria:
- Jira Task dibuat untuk verdict `HEAL`.
- Jira Bug dibuat untuk verdict `PRODUCT BUG`.
- Payload berisi: summary, description (ADF), issue type, labels, verdict, evidence, OpenSpec reference, proof.
- Dashboard menampilkan issue key dan URL jika berhasil, atau error state jika gagal.
- Run tetap tersimpan di PostgreSQL meskipun Jira publish gagal.

Konfigurasi:

```env
JIRA_SITE_URL=https://<team>.atlassian.net
JIRA_USER_EMAIL=<email>
JIRA_API_TOKEN=<token>
JIRA_PROJECT_KEY=<project-key>
JIRA_TASK_ISSUE_TYPE=Task
JIRA_BUG_ISSUE_TYPE=Bug
```

### FR-013 PostgreSQL Persistence

SpecHeal harus menyimpan seluruh run data ke PostgreSQL.

Acceptance Criteria:
- Menyimpan: run metadata, verdict, reason, AI trace, evidence summary, patch, validation result, Jira result.
- Menyediakan endpoint recent runs untuk dashboard.
- Menyediakan endpoint full report by run ID.

<<<<<<< HEAD
---
=======
- Menyimpan run metadata.
- Menyimpan verdict dan reason.
- Menyimpan AI trace.
- Menyimpan evidence summary.
- Menyimpan applied patch preview.
- Menyimpan validation dan rerun result.
- Menyimpan Jira publish result jika run membutuhkan Jira action.
- Menyediakan recent runs.
- Menyediakan full report by run ID.
>>>>>>> main

## 12. Non-Functional Requirements

### 12.1 Reliability

- Failed OpenAI call tidak boleh membuat UI blank — harus ada error state yang jelas.
- Failed Jira publish tidak boleh menghapus report — run tetap tersimpan.
- Run status harus selalu terdefinisi: `pending`, `running`, `completed`, atau `failed`.
- Dashboard harus dapat di-reload tanpa kehilangan data run sebelumnya.

### 12.2 Security

<<<<<<< HEAD
- OpenAI API key, Jira token, dan database URL hanya tersedia server-side.
- Secret disimpan sebagai environment variable atau Kubernetes Secret — tidak di-hardcode.
- Token tidak boleh muncul di log client atau response API publik.
- DOM evidence harus masking sensitive values sebelum dikirim ke OpenAI atau disimpan.
=======
1. Playwright test result.
2. Failure evidence.
3. OpenSpec clause.
4. OpenAI verdict.
5. Healing proof atau bug decision.
6. Jira publish result jika applicable, atau status report-only untuk healthy run.
>>>>>>> main

### 12.3 Performance

- Dashboard initial load: < 3 detik pada koneksi standar.
- Polling run status: interval < 3 detik per poll.
- Long-running operation (Playwright, OpenAI, Jira): harus memiliki loading state yang terlihat.

### 12.4 Observability

<<<<<<< HEAD
- Setiap run menyimpan timestamps: `createdAt`, `updatedAt`.
- Error state disimpan di PostgreSQL dan ditampilkan di dashboard.
- AI duration, token usage, dan estimated cost ditampilkan di AI trace jika tersedia.
=======
- Full report dapat dibuka dari dashboard.
- Full report menampilkan run overview.
- Full report menampilkan evidence screenshot jika ada.
- Full report menampilkan OpenSpec clause.
- Full report menampilkan AI trace.
- Full report menampilkan validation/rerun proof.
- Full report menampilkan Jira issue result jika applicable.
>>>>>>> main

### 12.5 Usability

- Judge dapat menjalankan demo tanpa membaca instruksi panjang (zero-instruction demo).
- Verdict harus terlihat jelas dengan visual differentiation yang kuat.
- Developer dapat membuka full report dalam maksimal 2 langkah navigasi.

---

## 13. Integration Requirements

### 13.1 OpenAI

OpenAI adalah core verdict engine. Komponen prompt wajib:

- Test name dan step name
- Failed selector dan Playwright error
- Visible evidence dan ranked candidates
- OpenSpec clause yang relevan
- Expected output schema (verdict, reason, confidence, candidate selector, patch/bug report)

<<<<<<< HEAD
Konfigurasi:
- Model dikonfigurasi via `OPENAI_MODEL`
- API key via `OPENAI_API_KEY` (server-side only)
=======
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
- applied patch preview jika `HEAL`,
- bug/task report jika bukan `HEAL`.
>>>>>>> main

### 13.2 Jira

| Verdict | Issue Type | Action |
|---|---|---|
| `HEAL` | Task | Review dan apply patch locator ke test file |
| `PRODUCT BUG` | Bug | Investigasi dan fix product regression |
| `SPEC OUTDATED` | Task | Update test atau spec mapping |
| `NO_HEAL_NEEDED` | — | Tidak wajib membuat issue |

### 13.3 PostgreSQL

PostgreSQL menyimpan:
<<<<<<< HEAD
- Run history dengan metadata lengkap
- AI trace: prompt, response, token usage, duration, estimated cost
- Evidence: screenshot reference, DOM, candidates
- Patch preview, validation result, dan rerun result
- Jira publish result: status, issue key, issue URL, error
=======

- run history,
- AI trace,
- evidence,
- screenshot evidence sebagai base64,
- applied patch preview,
- validation result,
- rerun result,
- Jira publish result jika applicable.
>>>>>>> main

### 13.4 Kubernetes

- Dashboard/API app sebagai container image
- Playwright runtime dengan browser dependencies
- PostgreSQL sebagai StatefulSet atau managed service
- Secret untuk OpenAI key, Jira token, dan database URL
- Service/Ingress untuk membuka dashboard ke publik

<<<<<<< HEAD
---
=======
- satu app container untuk dashboard/API, in-process Playwright runtime, OpenAI client, dan Jira publisher,
- PostgreSQL,
- service/ingress,
- secrets.
>>>>>>> main

## 14. Risks & Mitigations

| Risiko | Dampak | Prob. | Mitigasi |
|---|---|---|---|
| OpenAI API gagal saat demo | Tinggi | Rendah | Tampilkan error jujur + retry button. Siapkan API key cadangan. Validasi key sebelum demo. |
| Jira credential belum dikonfigurasi | Sedang | Sedang | Buat config health check di dashboard. Validasi project key saat startup. |
| Jira issue type berbeda dari konfigurasi | Sedang | Sedang | Gunakan configurable issue type via env variable. Test create issue sehari sebelum demo. |
| Playwright gagal jalan di container | Tinggi | Sedang | Gunakan base image resmi Playwright dengan browser deps. Test di environment yang sama. |
| Scope melebar saat development | Tinggi | Tinggi | Hard-scope ke Locator Drift dan Product Bug. Fitur lain masuk Future Roadmap. |
| AI verdict tidak akurat | Sedang | Rendah | Wajib ada browser validation dan rerun proof. Verdict AI tidak final tanpa bukti. |
| OpenSpec terlalu ambigu | Tinggi | Sedang | Tulis OpenSpec behavior-first, selector-agnostic. Review sebelum demo. |

---

## 15. Dependencies & Assumptions

### 15.1 Dependencies

- OpenAI API key yang valid dan aktif
- Jira Cloud site dengan project key yang sudah dibuat
- Jira API token dengan permission create issue
- PostgreSQL instance (managed atau self-hosted)
- Kubernetes VPS dari penyelenggara dengan network egress ke OpenAI dan Atlassian

### 15.2 Assumptions

- Jira project memiliki issue type Task dan Bug, atau nama issue type dapat dikonfigurasi via env variable.
- Judge dapat mengakses dashboard via URL deployment publik tanpa VPN.
- Demo menggunakan seeded scenario agar run bersifat deterministic dan mudah dinilai.
- OpenSpec ditulis cukup eksplisit untuk membedakan safe heal dari product bug secara otomatis.
- Kubernetes cluster dari penyelenggara memiliki egress ke internet (OpenAI + Atlassian API).

---

## 16. Open Questions

| Pertanyaan | Owner | Deadline |
|---|---|---|
| Jira project key dan issue type final apa yang akan dipakai? | Tim — konfirmasi ke penyelenggara | 12 Mei 2026 |
| Model OpenAI final apa yang optimal untuk verdict accuracy vs cost? | Tim — evaluasi gpt-4o vs gpt-4o-mini | 12 Mei 2026 |
| Domain/Ingress Kubernetes dari penyelenggara seperti apa formatnya? | Tim — tanya penyelenggara saat registrasi | 12 Mei 2026 |
| Screenshot evidence disimpan sebagai base64, file path, atau object storage? | Tim — keputusan arsitektur | Sebelum implementasi FR-004 |
| Apakah perlu attachment screenshot ke Jira untuk demo utama? | Tim — scope decision | 12 Mei 2026 |

---

## 17. Future Roadmap

### 17.1 Short-Term (Post-Hackathon)

<<<<<<< HEAD
- Demo penuh untuk `SPEC OUTDATED` dengan scenario nyata
- Screenshot attachment langsung ke Jira issue
- CI integration untuk membaca failed test run dari pipeline nyata (bukan seeded)
=======
- first screen langsung menunjukkan produk, project, dan action,
- bukan landing page marketing,
- bukan chatbot,
- bukan form kosong,
- scenario picker mudah dipahami,
- verdict sangat jelas,
- evidence ringkas di permukaan,
- detail audit tersedia di drawer/full report,
- OpenSpec tampil sebagai locked source of truth,
- Jira status tampil sebagai final workflow step ketika run membutuhkan action.
>>>>>>> main

### 17.2 Medium-Term

<<<<<<< HEAD
- GitHub PR patch suggestion — bukan hanya preview, tapi bisa buka PR langsung
- Multi-project OpenSpec mapping (lebih dari satu codebase)
- Support Cypress dan Selenium sebagai alternatif Playwright
- Trend dashboard: visualisasi selector drift over time per project
=======
- top bar: brand, project, selected scenario, status/verdict,
- control panel: scenario picker dan run CTA,
- report panel: timeline run,
- evidence panel: screenshot, patch, report output, Jira status jika applicable,
- trace drawer: prompt, raw output, validation details,
- full report page: audit lengkap.
>>>>>>> main

### 17.3 Long-Term

- Approval policy engine untuk auto-PR dengan guardrail team-level
- Multi-tenant SaaS dengan workspace isolation per tim
- Enterprise analytics: MTTR dari CI failure, false-green rate, heal success rate

---

## 18. Glossary

<<<<<<< HEAD
| Istilah | Definisi |
|---|---|
| OpenSpec | Spesifikasi behavior produk yang menjadi source of truth untuk semua verdict. Ditulis behavior-first, selector-agnostic. |
| Playwright | Framework browser automation test yang digunakan sebagai runtime execution SpecHeal. |
| Selector drift | Kondisi di mana selector test berubah atau hilang, namun behavior produk yang sebenarnya masih benar. |
| False green | Kondisi di mana test pass namun behavior produk sebenarnya melanggar requirement — akibat self-healing yang tidak tervalidasi. |
| HEAL | Verdict bahwa test gagal karena selector drift dan aman diperbaiki dengan patch locator yang tervalidasi. |
| PRODUCT BUG | Verdict bahwa produk melanggar requirement OpenSpec — tidak ada recovery yang aman, output adalah Jira Bug. |
| SPEC OUTDATED | Verdict bahwa test atau spec mapping perlu diperbarui karena flow produk berubah secara intentional. |
| NO_HEAL_NEEDED | Verdict bahwa test berjalan sukses dan tidak membutuhkan recovery. |
| Evidence capture | Proses pengambilan screenshot, DOM, error, dan candidates saat test gagal. |
| Candidate selector | Element DOM yang diusulkan AI sebagai pengganti selector yang gagal. |
| Rerun proof | Bukti bahwa test berhasil dijalankan ulang dengan candidate selector baru dan mencapai expected result. |
| AI trace | Log lengkap interaksi dengan OpenAI: prompt, raw response, parsed response, token usage, duration. |
| Jira publisher | Komponen SpecHeal yang bertanggung jawab membuat dan mempublikasikan Jira issue dari recovery report. |
| ShopFlow Checkout | Mini checkout app yang menjadi seeded system under test untuk demo SpecHeal. |
=======
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
6. `HEAL` menghasilkan validation proof, applied test patch, dan rerun proof.
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
Di skenario ini selector gagal, tapi payment behavior masih sesuai OpenSpec. SpecHeal meminta OpenAI memberi verdict, memvalidasi candidate di browser, menerapkan patch ke test file, melakukan rerun, lalu membuat Jira Task untuk review patch.
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
- Jira Cloud site `https://specheal.atlassian.net`.
- Jira project key `SH`.
- Jira API token.
- PostgreSQL.
- Kubernetes VPS dari penyelenggara.
- Network egress dari cluster ke OpenAI dan Atlassian.

Assumptions:

- Jira project punya issue type `Task` dan `Bug`, atau nama issue type dapat dikonfigurasi.
- Judge dapat mengakses dashboard via URL deployment.
- Demo memakai seeded scenario agar run deterministic dan mudah dinilai.
- OpenSpec ditulis cukup eksplisit untuk membedakan safe heal dan product bug.
- Model OpenAI MVP memakai `gpt-4o-mini`.
- Screenshot evidence MVP disimpan sebagai base64 di PostgreSQL.

## 22. Open Questions

- Domain/Ingress Kubernetes dari penyelenggara seperti apa?
- Jira permission dan issue type `Task`/`Bug` perlu divalidasi dengan API setelah credential aman dan di-rotate jika pernah terpapar.

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
| Rerun proof | Bukti test berhasil setelah patch locator diterapkan ke test file |
| Jira publisher | Komponen yang membuat issue Jira dari report |
>>>>>>> main
