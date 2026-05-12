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
3. C3 Component
4. Dynamic Diagram: Locator Drift HEAL Flow
5. Deployment Diagram: Kubernetes VPS

C4 Code diagram belum dibuat karena struktur code final belum stabil. Setelah implementasi utama selesai, diagram code bisa ditambahkan untuk komponen paling berisiko, misalnya `Patch Applicator` atau `OpenAI Verdict Engine`.

Catatan format:

- Diagram memakai Mermaid `flowchart` dengan gaya C4-like agar mudah dirender di Markdown.
- Istilah seperti container, component, runner, verdict, dan rerun proof dipertahankan karena lebih natural untuk konteks teknis.
- ShopFlow Checkout digambar sebagai target system secara logis, meskipun pada MVP route ShopFlow ikut berjalan di app container yang sama.

## 2. C1 - System Context

Diagram ini menunjukkan SpecHeal sebagai satu software system dan hubungan utamanya dengan actor serta external system.

```mermaid
flowchart LR
  qa["QA Engineer<br/>Menjalankan scenario dan membaca recovery report"]
  judge["Judge / Mentor<br/>Mengevaluasi demo end-to-end dan bukti teknis"]

  specheal(("SpecHeal<br/>AI-assisted recovery cockpit untuk Playwright UI test failures"))

  shopflow["ShopFlow Checkout<br/>Demo target system / System Under Test"]
  openai["OpenAI API<br/>Model: gpt-4o-mini"]
  jira["Jira Cloud<br/>Workflow output untuk action engineering"]

  qa -->|"Start run, review report, inspect Jira result"| specheal
  judge -->|"Run demo scenario dan nilai evidence"| specheal
  specheal -->|"Runs Playwright checkout test"| shopflow
  specheal -->|"Sends cleaned evidence + OpenSpec context"| openai
  specheal -->|"Creates Task/Bug via Jira REST API"| jira

  classDef person fill:#f7f7f7,stroke:#555,color:#111;
  classDef system fill:#e8f1ff,stroke:#1d4ed8,color:#111;
  classDef external fill:#fff7ed,stroke:#c2410c,color:#111;

  class qa,judge person;
  class specheal system;
  class shopflow,openai,jira external;
```

Keputusan penting:

- Actor utama MVP adalah QA Engineer. Judge dan mentor tetap bisa memakai dashboard sebagai evaluator.
- OpenAI adalah core verdict engine, bukan optional fallback.
- Jira Cloud adalah output workflow untuk hasil yang butuh action.
- ShopFlow diposisikan sebagai target system supaya jelas bahwa SpecHeal sedang memulihkan test terhadap aplikasi target.

## 3. C2 - Container

Diagram ini menjelaskan container logis di dalam SpecHeal. Dalam C4, container berarti unit aplikasi atau data store, bukan selalu Docker container.

```mermaid
flowchart LR
  qa["QA Engineer"]

  subgraph boundary["SpecHeal System Boundary"]
    app["SpecHeal App Container<br/>Next.js dashboard, API routes, in-process Playwright runner, OpenAI client, Jira publisher"]
    shopflow["ShopFlow Checkout Demo<br/>Target route untuk Healthy Flow, Locator Drift, Product Bug<br/>MVP: served by the same app container"]
    openspec["OpenSpec Files<br/>Behavior contract untuk ShopFlow dan SpecHeal recovery"]
    postgres[("PostgreSQL<br/>Run history, evidence, base64 screenshots, AI trace, applied patch preview, Jira publish result")]
  end

  openai["OpenAI API<br/>gpt-4o-mini"]
  jira["Jira Cloud<br/>Project key: SH"]

  qa -->|"Uses dashboard"| app
  app -->|"Runs Playwright tests against"| shopflow
  app -->|"Reads behavior requirements"| openspec
  app -->|"Stores and reads reports"| postgres
  app -->|"Requests structured verdict"| openai
  app -->|"Publishes actionable results"| jira

  classDef person fill:#f7f7f7,stroke:#555,color:#111;
  classDef container fill:#e0f2fe,stroke:#0369a1,color:#111;
  classDef datastore fill:#dcfce7,stroke:#15803d,color:#111;
  classDef external fill:#fff7ed,stroke:#c2410c,color:#111;

  class qa person;
  class app,shopflow,openspec container;
  class postgres datastore;
  class openai,jira external;
```

Keputusan penting:

- App MVP dijalankan sebagai satu app container agar deployment cepat dan sederhana.
- ShopFlow dipisah secara logis di diagram karena perannya adalah target system, tetapi pada deployment MVP tetap ikut dalam app container yang sama.
- PostgreSQL adalah data store milik SpecHeal dan menyimpan screenshot sebagai base64 untuk MVP.
- Jira project key `SH` dicatat sebagai konfigurasi target, bukan hardcoded di arsitektur.

## 4. C3 - Component: SpecHeal App Container

Diagram ini melakukan zoom-in ke `SpecHeal App Container`.

```mermaid
flowchart LR
  qa["QA Engineer"]

  subgraph app["SpecHeal App Container"]
    dashboard["Dashboard UI<br/>Scenario picker, timeline, full report, AI trace drawer"]
    runApi["Run API<br/>Create run, poll status, fetch report, retry Jira publish"]
    orchestrator["Run Orchestrator<br/>Controls scenario execution and terminal state"]
    playwright["Playwright Runner<br/>Runs checkout test in browser"]
    evidence["Evidence Collector<br/>Screenshot, error, DOM, visible text, candidates"]
    domCleaner["DOM Cleaner<br/>Removes noise and masks sensitive values"]
    openspecLoader["OpenSpec Loader<br/>Loads relevant behavior clauses"]
    verdictEngine["OpenAI Verdict Engine<br/>Calls gpt-4o-mini and parses structured output"]
    validator["Candidate Validator<br/>Checks selector is unique, visible, enabled, clickable"]
    patcher["Patch Applicator<br/>Applies safe locator patch to Playwright test file"]
    rerun["Rerun Proof Engine<br/>Runs patched test and requires Payment Success"]
    jiraPublisher["Jira Publisher<br/>Builds ADF payload and creates Task/Bug"]
    repository["Run Repository<br/>Persists run, evidence, trace, patch, Jira result"]
  end

  shopflow["ShopFlow Checkout Demo"]
  openspec["OpenSpec Files"]
  postgres[("PostgreSQL")]
  openai["OpenAI API<br/>gpt-4o-mini"]
  jira["Jira Cloud"]

  qa -->|"Starts scenario and reads result"| dashboard
  dashboard -->|"POST / runs and polling"| runApi
  runApi -->|"Creates run job"| orchestrator
  orchestrator -->|"Executes baseline test"| playwright
  playwright -->|"Browser automation"| shopflow
  playwright -->|"Failure data"| evidence
  evidence -->|"Raw DOM"| domCleaner
  orchestrator -->|"Loads source of truth"| openspecLoader
  openspecLoader -->|"Reads"| openspec
  orchestrator -->|"Failure package"| verdictEngine
  domCleaner -->|"Cleaned evidence"| verdictEngine
  openspecLoader -->|"OpenSpec clause"| verdictEngine
  verdictEngine -->|"Structured verdict request"| openai
  verdictEngine -->|"HEAL candidate"| validator
  validator -->|"Valid candidate"| patcher
  patcher -->|"Patched test file"| rerun
  rerun -->|"Rerun browser test"| shopflow
  verdictEngine -->|"PRODUCT BUG / SPEC OUTDATED / RUN_ERROR"| jiraPublisher
  rerun -->|"Safe HEAL proof"| jiraPublisher
  jiraPublisher -->|"Create issue via REST API"| jira
  orchestrator -->|"Run state updates"| repository
  evidence -->|"Evidence artifacts"| repository
  verdictEngine -->|"AI trace and verdict"| repository
  patcher -->|"Applied patch preview"| repository
  rerun -->|"Rerun proof"| repository
  jiraPublisher -->|"Publish result"| repository
  repository -->|"Read/write"| postgres
  runApi -->|"Read reports"| repository

  classDef person fill:#f7f7f7,stroke:#555,color:#111;
  classDef component fill:#ede9fe,stroke:#6d28d9,color:#111;
  classDef core fill:#fef3c7,stroke:#b45309,color:#111;
  classDef datastore fill:#dcfce7,stroke:#15803d,color:#111;
  classDef external fill:#fff7ed,stroke:#c2410c,color:#111;

  class qa person;
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

## 5. Dynamic Diagram - Locator Drift HEAL Flow

Diagram ini menjelaskan urutan runtime untuk scenario paling penting: selector lama gagal, behavior masih benar, lalu SpecHeal melakukan safe heal.

```mermaid
flowchart TD
  s1["1. QA Engineer starts Locator Drift run"]
  s2["2. SpecHeal creates run record in PostgreSQL"]
  s3["3. Playwright Runner opens ShopFlow Locator Drift state"]
  s4["4. Baseline selector fails"]
  s5["5. Evidence Collector captures error, screenshot, DOM, visible text, candidates"]
  s6["6. DOM Cleaner masks sensitive data and removes framework noise"]
  s7["7. OpenSpec Loader reads checkout payment requirement"]
  s8["8. OpenAI Verdict Engine calls gpt-4o-mini"]
  s9["9. OpenAI returns HEAL with candidate selector and patch object"]
  s10["10. Candidate Validator checks selector is unique, visible, enabled, clickable"]
  s11["11. Patch Applicator applies locator patch to Playwright test file"]
  s12["12. Rerun Proof Engine executes patched test"]
  s13["13. Patched test reaches Payment Success"]
  s14["14. Run Repository stores report, AI trace, screenshot, applied patch, proof"]
  s15["15. Jira Publisher creates Task for patch review"]
  s16["16. Dashboard shows timeline, applied patch preview, rerun proof, Jira issue link"]

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

## 6. Deployment Diagram - Kubernetes VPS

Diagram ini menjelaskan bentuk runtime MVP di Kubernetes. App dan database tidak digabung dalam satu Docker image.

```mermaid
flowchart TB
  user["QA Engineer / Judge<br/>Browser"]

  subgraph cluster["Kubernetes VPS"]
    subgraph ns["Namespace: specheal"]
      ingress["Service / optional Ingress<br/>Exposes SpecHeal dashboard"]

      subgraph appPod["Pod: specheal-app"]
        appContainer["Container: specheal-app<br/>Next.js dashboard/API<br/>In-process Playwright runner<br/>OpenAI client<br/>Jira publisher<br/>ShopFlow demo route"]
      end

      secret["Kubernetes Secret<br/>OPENAI_API_KEY<br/>OPENAI_MODEL=gpt-4o-mini<br/>JIRA_SITE_URL<br/>JIRA_USER_EMAIL<br/>JIRA_API_TOKEN<br/>JIRA_PROJECT_KEY=SH<br/>DATABASE_URL"]

      pgService["Service: specheal-postgres"]

      subgraph pgPod["Pod: specheal-postgres"]
        pgContainer["Container: postgres<br/>Official PostgreSQL image"]
      end

      pvc[("PVC: postgres-data<br/>Persistent database storage")]
    end
  end

  openai["OpenAI API<br/>gpt-4o-mini"]
  jira["Jira Cloud<br/>REST API"]

  user -->|"HTTPS"| ingress
  ingress -->|"Routes web/API traffic"| appContainer
  secret -->|"Injected as server-side env vars"| appContainer
  appContainer -->|"Reads/writes run data"| pgService
  pgService -->|"TCP 5432"| pgContainer
  pgContainer -->|"Stores data on"| pvc
  appContainer -->|"HTTPS structured verdict calls"| openai
  appContainer -->|"HTTPS create issue calls"| jira

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
- Kubernetes Secret menyimpan credential dan runtime config. Secret tidak boleh muncul di client, report JSON, atau Jira issue body.
- ShopFlow route ikut di `specheal-app` untuk MVP, tetapi tetap diposisikan sebagai target system secara logis di C1/C2.

## 7. Architecture Notes

### 7.1 Actionable Jira Results

SpecHeal hanya membuat Jira issue untuk terminal result yang butuh action:

| Result | Jira Output |
| --- | --- |
| `NO_HEAL_NEEDED` | Tidak membuat issue secara default |
| `HEAL` | Task untuk review/apply patch |
| `PRODUCT BUG` | Bug untuk memperbaiki product regression |
| `SPEC OUTDATED` | Task untuk update test/spec mapping |
| Operational error | Task untuk investigasi runtime/config |

### 7.2 Evidence Storage

Untuk MVP, screenshot disimpan sebagai base64 di PostgreSQL. Ini dipilih karena demo scope kecil dan paling cepat diimplementasikan. Setelah MVP, evidence dapat dipindahkan ke object storage atau attachment Jira jika dibutuhkan.

### 7.3 Why No C4 Code Diagram Yet

C4 Code diagram sengaja ditunda karena code final belum stabil. Membuatnya terlalu awal berisiko menghasilkan diagram yang cepat salah setelah implementasi paralel berjalan.

Kandidat C4 Code setelah app stabil:

- `Patch Applicator`
- `OpenAI Verdict Engine`
- `Jira Publisher`

## 8. References

- C4 Model: https://c4model.com/
- C4 Diagrams: https://c4model.com/diagrams
- Mermaid Flowchart Syntax: https://mermaid.js.org/syntax/flowchart.html
