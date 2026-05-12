# Master Project Context

## What SpecHeal Is

SpecHeal adalah AI-assisted recovery cockpit untuk Playwright UI test failures.

Produk ini membantu QA Engineer menjalankan scenario test, melihat failure evidence, memahami apakah failure aman di-heal atau harus dieskalasi, lalu mengirim hasil yang actionable ke Jira.

SpecHeal dibangun untuk Refactory Hackathon 2026 dengan tema Engineering Productivity x AI.

## What Problem It Solves

UI automation failure sering ambigu:

- product benar-benar rusak;
- selector test drift karena UI refactor;
- test terlalu rapuh;
- spec/test mapping sudah outdated;
- runtime automation gagal.

Tanpa alat yang jelas, QA dan developer membuang waktu untuk menjawab pertanyaan dasar:

> Apakah failure ini bug produk, test drift, atau spec yang sudah tidak sesuai?

SpecHeal menjawab dengan evidence, OpenSpec, AI verdict, proof, report, dan Jira handoff.

## Primary User

### QA Engineer

QA Engineer adalah primary user.

Needs:

- menjalankan recovery scenario dari dashboard;
- membaca verdict dengan cepat;
- melihat evidence tanpa inspect manual;
- memastikan safe heal benar-benar aman;
- mengirim output ke developer lewat Jira;
- mengaudit history run.

Success signal:

QA Engineer dapat menjalankan scenario, membaca verdict, melihat proof, dan meneruskan output ke Jira dari satu dashboard.

## Secondary Recipients

### Frontend Developer

Menerima Jira Task untuk review patch locator atau Jira Bug untuk memperbaiki product regression.

### Engineering Lead

Melihat bahwa automation failure punya audit trail dan tidak berubah menjadi blind AI healing.

### Hackathon Judge

Melihat vertical slice yang lengkap: dashboard, OpenSpec, OpenAI, Playwright, PostgreSQL, Jira, Kubernetes.

## Demo Product: ShopFlow Checkout

SpecHeal memakai seeded demo app bernama ShopFlow Checkout.

Checkout flow:

1. User membuka checkout.
2. User melihat order details dan payment summary.
3. User menekan payment action.
4. System menampilkan `Payment Success`.

## Demo Scenarios

### Healthy Flow

Baseline selector masih bekerja. Test mencapai `Payment Success`.

Output:

- verdict `NO_HEAL_NEEDED`;
- report tersimpan;
- Jira tidak dibuat secara default.

### Locator Drift

Baseline selector `#pay-now` gagal karena implementation berubah, tetapi payment behavior masih tersedia lewat selector baru.

Example:

```ts
await page.click("#pay-now");
```

UI berubah menjadi:

```html
<button data-testid="complete-payment">Pay Now</button>
```

Output:

- OpenAI verdict `HEAL`;
- candidate selector divalidasi di browser;
- controlled test-file patch diterapkan;
- patched test direrun sampai `Payment Success`;
- Jira Task dibuat untuk review/apply patch.

### Product Bug

Payment action yang diwajibkan OpenSpec hilang atau unavailable.

Output:

- OpenAI verdict `PRODUCT BUG`;
- tidak ada safe patch;
- Jira Bug dibuat dengan evidence.

## Supported Outcomes

### NO_HEAL_NEEDED

Baseline test pass. Tidak perlu AI recovery.

### HEAL

Failure terjadi karena locator drift. Behavior masih benar. Candidate selector valid. Patch aman setelah proof.

### PRODUCT BUG

Required behavior hilang atau rusak. Tidak boleh dipaksa hijau.

### SPEC OUTDATED

Test/spec mapping tidak lagi sesuai dengan intended behavior. Output adalah Jira Task untuk review spec/test mapping.

### RUN_ERROR

Operational failure sebelum trusted recovery verdict tersedia. Output adalah Jira Task untuk investigasi runtime.

## Core System Pieces

- Next.js dashboard and API
- Playwright runtime
- ShopFlow Checkout demo target
- OpenSpec source loader
- OpenAI verdict pipeline with `gpt-4o-mini`
- Candidate validation and rerun proof
- Controlled Playwright test-file patching
- PostgreSQL run and artifact store
- Jira Cloud REST API publisher
- Kubernetes deployment manifests

## What Makes SpecHeal Different

SpecHeal does not stop at "AI found a selector."

SpecHeal adds:

- behavior contract through OpenSpec;
- failure evidence capture;
- structured OpenAI verdict;
- browser validation;
- controlled test-file patch;
- rerun proof;
- Jira workflow output;
- PostgreSQL audit report.

This is why the product should be pitched as evidence-backed recovery, not self-healing.

