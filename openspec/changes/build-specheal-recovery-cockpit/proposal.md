## Why

UI automation failure sering tidak langsung berarti product bug. Selector drift dapat membuat CI merah walaupun behavior produk masih benar, sementara self-healing yang terlalu agresif dapat menghasilkan false green ketika test dibuat pass meskipun requirement dilanggar.

SpecHeal dibutuhkan sebagai recovery cockpit yang memakai live OpenAI, OpenSpec, browser validation, rerun proof, PostgreSQL, Jira, dan Kubernetes deployment untuk mengubah Playwright failure menjadi keputusan engineering yang bisa dipercaya dan ditindaklanjuti.

## What Changes

- Menambahkan seeded demo product ShopFlow Checkout sebagai system under test untuk membuktikan Healthy Flow, Locator Drift, dan Product Bug.
- Menambahkan dashboard SpecHeal untuk menjalankan scenario, melihat run timeline, membuka full report, dan mengaudit AI trace.
- Menambahkan Playwright runtime execution untuk menjalankan checkout test, mengambil failure evidence, memvalidasi candidate selector, dan melakukan rerun proof.
- Menambahkan OpenSpec-guarded recovery pipeline yang memakai live OpenAI untuk failed-run verdict `HEAL`, `PRODUCT BUG`, atau `SPEC OUTDATED`, sementara successful baseline run diklasifikasikan sebagai `NO_HEAL_NEEDED`.
- Menambahkan Jira integration yang otomatis membuat Jira issue untuk hasil yang membutuhkan tindak lanjut: safe heal, product bug, spec outdated, dan operational run error. Healthy/no-heal disimpan sebagai audit report tanpa Jira issue secara default.
- Menambahkan PostgreSQL persistence untuk run history, evidence summary, AI trace, patch preview, validation/rerun result, dan Jira publish result.
- Menambahkan deployment readiness agar runtime product dapat berjalan di Kubernetes pada VPS hackathon.

## Capabilities

### New Capabilities

- `shopflow-checkout`: Mendefinisikan behavior ShopFlow Checkout sebagai demo app yang diuji, termasuk payment completion, payment action availability, locator drift state, product bug state, dan successful payment result.
- `specheal-recovery`: Mendefinisikan behavior utama SpecHeal sebagai recovery cockpit, termasuk scenario run, Playwright evidence capture, OpenSpec guardrail, live OpenAI verdict, candidate validation, rerun proof, report timeline, persistence, dan Kubernetes readiness.
- `jira-integration`: Mendefinisikan behavior publikasi otomatis ke Jira untuk actionable recovery output, termasuk payload mapping, issue type mapping, publish status, failure handling, dan retry.

### Modified Capabilities

- Tidak ada. Ini adalah initial capability set untuk MVP SpecHeal.

## Impact

- Aplikasi web/dashboard untuk judge, mentor, dan developer.
- API untuk membuat run, polling run status, membuka report, dan retry publish Jira.
- Playwright runtime dan browser dependency.
- OpenAI API integration untuk structured verdict generation.
- Jira Cloud REST API integration untuk issue creation.
- PostgreSQL schema untuk menyimpan run dan artifact.
- Kubernetes deployment artifact, secret configuration, service, dan ingress/runtime exposure.
