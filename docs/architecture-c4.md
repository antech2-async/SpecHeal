# SpecHeal C4 Architecture Model

Status: Draft planning  
Tim: Merge Kalau Berani  
Event: Refactory Hackathon 2026, Telkom Round  
Scope: MVP SpecHeal untuk ShopFlow Checkout recovery demo

## 1. Cara Membaca Dokumen

Dokumen ini memakai pendekatan C4 Model untuk menjelaskan arsitektur SpecHeal dari level bisnis sampai runtime deployment.

Diagram yang dibuat sekarang:

1. C1 System Context
2. C2 Container
3. C3 Component Overview
4. C3 Component Detail
5. Dynamic Diagram: Locator Drift HEAL Flow
6. Deployment Diagram: Kubernetes VPS

C4 Code diagram belum dibuat karena struktur code final belum stabil. Setelah implementasi utama selesai, diagram code bisa ditambahkan untuk komponen paling berisiko, misalnya `Patch Applicator` atau `OpenAI Verdict Engine`.

Catatan format:

- Diagram memakai Mermaid `flowchart` dengan gaya C4-like agar mudah dirender di Markdown.
- Istilah seperti container, component, runner, verdict, dan rerun proof dipertahankan karena lebih natural untuk konteks teknis.
- ShopFlow Checkout digambar sebagai target system secara logis, meskipun pada MVP route ShopFlow ikut berjalan di app container yang sama.

## 2. C1 - System Context

Diagram ini menunjukkan SpecHeal sebagai satu software system dan hubungan utamanya dengan actor serta external system.

```mermaid
flowchart LR
  qa["QA Engineer<br/>Runs and reviews recovery"]

  specheal(("SpecHeal<br/>Safe UI test recovery"))

  shopflow["ShopFlow Checkout<br/>System Under Test"]
  openai["OpenAI API<br/>Model: gpt-4o-mini"]
  jira["Jira Cloud<br/>Action tracking"]

  qa -->|"Menjalankan run dan membaca report"| specheal
  specheal -->|"Menguji checkout flow"| shopflow
  specheal -->|"Meminta verdict AI"| openai
  specheal -->|"Membuat Task/Bug"| jira

  classDef person fill:#f7f7f7,stroke:#555,color:#111;
  classDef system fill:#e8f1ff,stroke:#1d4ed8,color:#111;
  classDef external fill:#fff7ed,stroke:#c2410c,color:#111;

  class qa person;
  class specheal system;
  class shopflow,openai,jira external;
```

Keputusan penting:

- Actor utama MVP adalah QA Engineer. Judge dan mentor tetap dibahas di PRD sebagai evaluator hackathon, tetapi tidak ditampilkan sebagai product actor di C1.
- OpenAI adalah core verdict engine, bukan optional fallback.
- Jira Cloud adalah output workflow untuk hasil yang butuh action.
- ShopFlow diposisikan sebagai target system supaya jelas bahwa SpecHeal sedang memulihkan test terhadap aplikasi target.

## 3. C2 - Container

Diagram ini menjelaskan container logis di dalam SpecHeal. Dalam C4, container berarti unit aplikasi atau data store, bukan selalu Docker container.

```mermaid
flowchart LR
  qa["QA Engineer"]

  subgraph boundary["SpecHeal System Boundary"]
    app["SpecHeal App<br/>[Next.js, Node.js, Playwright]<br/>Dashboard + recovery runtime"]
    openspec[("OpenSpec Store<br/>[Markdown files]<br/>Behavior contracts")]
    postgres[("PostgreSQL<br/>[PostgreSQL]<br/>Run artifacts + evidence")]
  end

  shopflow["ShopFlow Checkout<br/>[System Under Test]"]
  openai["OpenAI API<br/>gpt-4o-mini"]
  jira["Jira Cloud<br/>Project key: SH"]

  qa -->|"Membuka dashboard"| app
  app -->|"Menjalankan Playwright test"| shopflow
  app -->|"Membaca requirement"| openspec
  app -->|"Menyimpan report"| postgres
  app -->|"Meminta structured verdict"| openai
  app -->|"Publish actionable result"| jira

  classDef person fill:#f7f7f7,stroke:#555,color:#111;
  classDef container fill:#e0f2fe,stroke:#0369a1,color:#111;
  classDef datastore fill:#dcfce7,stroke:#15803d,color:#111;
  classDef external fill:#fff7ed,stroke:#c2410c,color:#111;

  class qa person;
  class app container;
  class openspec,postgres datastore;
  class shopflow,openai,jira external;
```

Keputusan penting:

- App MVP dijalankan sebagai satu app container agar deployment cepat dan sederhana.
- ShopFlow berada di luar boundary karena perannya adalah System Under Test, tetapi pada deployment MVP tetap co-located di app container yang sama.
- OpenSpec digambar sebagai file store karena bukan service yang runnable.
- PostgreSQL adalah data store milik SpecHeal dan menyimpan screenshot sebagai base64 untuk MVP.
- Jira project key `SH` dicatat sebagai konfigurasi target, bukan hardcoded di arsitektur.

## 4. C3 - Component Overview: SpecHeal App Container

This diagram shows the main component groups inside the `SpecHeal App Container`. It is intended as the first C3 view before reading the detailed component diagram.

```mermaid
flowchart LR
  subgraph app["SpecHeal App Container"]
    interface["Interface Layer<br/>Dashboard and API"]
    recovery["Recovery Pipeline<br/>Test, evidence, AI verdict, patch, rerun"]
    integration["Integration Layer<br/>Storage and Jira publishing"]
  end

  shopflow["ShopFlow Checkout<br/>System Under Test"]
  openspec["OpenSpec Store"]
  postgres[("PostgreSQL")]
  openai["OpenAI API<br/>gpt-4o-mini"]
  jira["Jira Cloud"]

  interface -->|"Starts and reads runs"| recovery
  recovery -->|"Runs tests"| shopflow
  recovery -->|"Reads requirements"| openspec
  recovery -->|"Analyzes failure"| openai
  recovery -->|"Sends artifacts"| integration
  integration -->|"Stores reports"| postgres
  integration -->|"Creates Task/Bug"| jira
  interface -->|"Reads reports"| integration

  classDef component fill:#ede9fe,stroke:#6d28d9,color:#111;
  classDef datastore fill:#dcfce7,stroke:#15803d,color:#111;
  classDef external fill:#fff7ed,stroke:#c2410c,color:#111;

  class interface,recovery,integration component;
  class postgres datastore;
  class shopflow,openspec,openai,jira external;
```

This overview intentionally hides implementation detail. The detailed C3 diagram below expands each group into concrete components.

## 5. C3 - Component Detail: SpecHeal App Container

Diagram ini melakukan zoom-in detail ke `SpecHeal App Container`.

```mermaid
flowchart LR
  subgraph app["SpecHeal App Container"]
    subgraph interface["Interface"]
      dashboard["Dashboard UI<br/>[React / Next.js]<br/>Run + report UI"]
      runApi["Run API<br/>[Next.js API Route]<br/>Run/report endpoints"]
    end

    subgraph recovery["Recovery Pipeline"]
      orchestrator["Run Orchestrator<br/>[TypeScript]<br/>Controls run state"]
      playwright["Playwright Runner<br/>[Playwright, Chromium]<br/>Runs browser test"]
      evidence["Evidence Collector<br/>[Playwright]<br/>Captures failure data"]
      domCleaner["DOM Cleaner<br/>[TypeScript]<br/>Cleans AI evidence"]
      openspecLoader["OpenSpec Loader<br/>[Markdown files]<br/>Loads clauses"]
      verdictEngine["OpenAI Verdict Engine<br/>[OpenAI SDK, gpt-4o-mini]<br/>Returns verdict"]
      validator["Candidate Validator<br/>[Playwright]<br/>Checks selector safety"]
      patcher["Patch Applicator<br/>[TypeScript]<br/>Applies locator patch"]
      rerun["Rerun Proof Engine<br/>[Playwright, Chromium]<br/>Proves patched test"]
    end

    subgraph integration["Persistence & Integration"]
      jiraPublisher["Jira Publisher<br/>[Jira REST API v3, ADF]<br/>Creates Task/Bug"]
      repository["Run Repository<br/>[TypeScript, SQL/ORM adapter]<br/>Stores artifacts"]
    end
  end

  shopflow["ShopFlow Checkout<br/>System Under Test"]
  openspec["OpenSpec Store"]
  postgres[("PostgreSQL")]
  openai["OpenAI API<br/>gpt-4o-mini"]
  jira["Jira Cloud"]

  dashboard -->|"Start run / cek report"| runApi
  runApi -->|"Buat job"| orchestrator
  orchestrator -->|"Run baseline test"| playwright
  playwright -->|"Jalankan browser test"| shopflow
  playwright -->|"Saat test gagal"| evidence
  evidence -->|"Bersihkan DOM"| domCleaner
  orchestrator -->|"Ambil requirement"| openspecLoader
  openspecLoader -->|"Baca OpenSpec"| openspec
  domCleaner -->|"Kirim evidence"| verdictEngine
  openspecLoader -->|"Kirim requirement"| verdictEngine
  verdictEngine -->|"Analisis failure"| openai
  verdictEngine -->|"Candidate HEAL"| validator
  validator -->|"Candidate aman"| patcher
  patcher -->|"Patch test file"| rerun
  rerun -->|"Rerun test"| shopflow
  verdictEngine -->|"Bug/spec/error"| jiraPublisher
  rerun -->|"HEAL terbukti"| jiraPublisher
  jiraPublisher -->|"Buat Task/Bug"| jira
  orchestrator -->|"Simpan state"| repository
  evidence -->|"Simpan evidence"| repository
  verdictEngine -->|"Simpan AI trace"| repository
  patcher -->|"Simpan patch"| repository
  rerun -->|"Simpan proof"| repository
  jiraPublisher -->|"Simpan Jira result"| repository
  repository -->|"Read/write"| postgres
  runApi -->|"Ambil report"| repository

  classDef component fill:#ede9fe,stroke:#6d28d9,color:#111;
  classDef core fill:#fef3c7,stroke:#b45309,color:#111;
  classDef datastore fill:#dcfce7,stroke:#15803d,color:#111;
  classDef external fill:#fff7ed,stroke:#c2410c,color:#111;

  class dashboard,runApi,orchestrator,playwright,evidence,domCleaner,openspecLoader,verdictEngine,validator,repository,jiraPublisher,rerun component;
  class patcher core;
  class postgres datastore;
  class shopflow,openspec,openai,jira external;
```

Komponen yang paling penting untuk inovasi:

- `OpenAI Verdict Engine`: menghasilkan verdict terstruktur dari evidence dan OpenSpec.
- `Candidate Validator`: memastikan AI candidate aman secara browser-level.
- `Patch Applicator`: menerapkan patch locator ke test file secara controlled.
- `Rerun Proof Engine`: membuktikan test yang sudah dipatch benar-benar mencapai `Payment Success`.
- `Jira Publisher`: mengubah hasil terminal menjadi workflow action.

## 6. Dynamic Diagram - Locator Drift HEAL Flow

Diagram ini menjelaskan urutan runtime untuk scenario paling penting: selector lama gagal, behavior masih benar, lalu SpecHeal melakukan safe heal.

```mermaid
flowchart TD
  s1["1. QA Engineer starts Locator Drift run"]
  s2["2. SpecHeal creates run record in PostgreSQL"]
  s3["3. Playwright opens ShopFlow drift state"]
  s4["4. Baseline selector fails"]
  s5["5. Evidence is captured"]
  s6["6. DOM evidence is cleaned"]
  s7["7. OpenSpec clause is loaded"]
  s8["8. OpenAI Verdict Engine calls gpt-4o-mini"]
  s9["9. OpenAI returns HEAL"]
  s10["10. Candidate selector is validated"]
  s11["11. Patch is applied to test file"]
  s12["12. Patched test is rerun"]
  s13["13. Rerun reaches Payment Success"]
  s14["14. Report artifacts are stored"]
  s15["15. Jira Task is created"]
  s16["16. Dashboard shows proof and Jira link"]

  s1 --> s2 --> s3 --> s4 --> s5 --> s6 --> s7 --> s8 --> s9 --> s10 --> s11 --> s12 --> s13 --> s14 --> s15 --> s16

  classDef user fill:#f7f7f7,stroke:#555,color:#111;
  classDef runtime fill:#e0f2fe,stroke:#0369a1,color:#111;
  classDef ai fill:#fff7ed,stroke:#c2410c,color:#111;
  classDef core fill:#fef3c7,stroke:#b45309,color:#111;
  classDef data fill:#dcfce7,stroke:#15803d,color:#111;

  class s1 user;
  class s2,s3,s4,s5,s6,s7,s10,s12,s13,s16 runtime;
  class s8,s9 ai;
  class s11 core;
  class s14,s15 data;
```

Kenapa dynamic diagram fokus ke Locator Drift:

- Ini flow paling kaya untuk demo.
- Flow ini memperlihatkan seluruh mekanisme: evidence, OpenSpec, OpenAI, validation, patch, rerun, persistence, Jira.
- Product Bug flow lebih sederhana karena berhenti di report dan Jira Bug tanpa patch.

## 7. Deployment Diagram - Kubernetes VPS

Diagram ini menjelaskan bentuk runtime MVP di Kubernetes. App dan database tidak digabung dalam satu Docker image.

```mermaid
flowchart TB
  user["QA Engineer / Judge<br/>Browser"]

  subgraph cluster["Kubernetes VPS"]
    subgraph ns["Namespace: specheal"]
      ingress["Service / Ingress<br/>Public dashboard access"]

      subgraph appPod["Pod: specheal-app"]
        appContainer["Container: specheal-app<br/>Dashboard/API + recovery runtime<br/>ShopFlow demo route"]
      end

      secret["Kubernetes Secret<br/>Runtime credentials"]

      pgService["Service: specheal-postgres"]

      subgraph pgPod["Pod: specheal-postgres"]
        pgContainer["Container: postgres<br/>Official image"]
      end

      pvc[("PVC: postgres-data<br/>Persistent database storage")]
    end
  end

  openai["OpenAI API<br/>gpt-4o-mini"]
  jira["Jira Cloud<br/>REST API"]

  user -->|"HTTPS, port 443"| ingress
  ingress -->|"Routes web/API traffic"| appContainer
  secret -->|"Injected as server-side env vars"| appContainer
  appContainer -->|"Run data, TCP 5432"| pgService
  pgService -->|"TCP 5432"| pgContainer
  pgContainer -->|"Stores data on"| pvc
  appContainer -->|"HTTPS REST, port 443"| openai
  appContainer -->|"HTTPS REST, port 443"| jira

  classDef user fill:#f7f7f7,stroke:#555,color:#111;
  classDef kube fill:#e0f2fe,stroke:#0369a1,color:#111;
  classDef secret fill:#fee2e2,stroke:#b91c1c,color:#111;
  classDef datastore fill:#dcfce7,stroke:#15803d,color:#111;
  classDef external fill:#fff7ed,stroke:#c2410c,color:#111;

  class user user;
  class ingress,appContainer,pgService,pgContainer kube;
  class secret secret;
  class pvc datastore;
  class openai,jira external;
```

Deployment decisions:

- `specheal-app` adalah satu app container untuk MVP agar deployment cepat.
- PostgreSQL memakai official image sebagai pod/service terpisah.
- PVC dipakai agar data PostgreSQL tidak hilang saat pod restart.
- Kubernetes Secret menyimpan credential dan runtime config: `OPENAI_API_KEY`, `OPENAI_MODEL`, Jira config, dan `DATABASE_URL`. Secret tidak boleh muncul di client, report JSON, atau Jira issue body.
- ShopFlow route ikut di `specheal-app` untuk MVP, tetapi tetap diposisikan sebagai target system secara logis di C1/C2.

## 8. Architecture Notes

### 8.1 Actionable Jira Results

SpecHeal hanya membuat Jira issue untuk terminal result yang butuh action:

| Result | Jira Output |
| --- | --- |
| `NO_HEAL_NEEDED` | Tidak membuat issue secara default |
| `HEAL` | Task untuk review/apply patch |
| `PRODUCT BUG` | Bug untuk memperbaiki product regression |
| `SPEC OUTDATED` | Task untuk update test/spec mapping |
| Operational error | Task untuk investigasi runtime/config |

### 8.2 Evidence Storage

Untuk MVP, screenshot disimpan sebagai base64 di PostgreSQL. Ini dipilih karena demo scope kecil dan paling cepat diimplementasikan. Setelah MVP, evidence dapat dipindahkan ke object storage atau attachment Jira jika dibutuhkan.

### 8.3 Why No C4 Code Diagram Yet

C4 Code diagram sengaja ditunda karena code final belum stabil. Membuatnya terlalu awal berisiko menghasilkan diagram yang cepat salah setelah implementasi paralel berjalan.

Kandidat C4 Code setelah app stabil:

- `Patch Applicator`
- `OpenAI Verdict Engine`
- `Jira Publisher`

## 9. References

- C4 Model: https://c4model.com/
- C4 Diagrams: https://c4model.com/diagrams
- Mermaid Flowchart Syntax: https://mermaid.js.org/syntax/flowchart.html
