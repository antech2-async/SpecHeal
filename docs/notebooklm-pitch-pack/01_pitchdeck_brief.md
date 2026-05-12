# SpecHeal Pitch Deck Brief

## One-Liner

SpecHeal adalah recovery cockpit untuk Playwright UI test failure yang membedakan locator drift, product bug, dan spec mismatch dengan bantuan OpenSpec, OpenAI, browser proof, PostgreSQL, dan Jira.

## Short Pitch

Automation testing sudah menjadi fondasi engineering modern, tetapi UI test failure sering tidak lagi bisa dipercaya. Satu failure bisa berarti produk rusak, test rapuh, selector berubah, atau spec sudah tidak sesuai.

SpecHeal membantu QA Engineer mengubah failure itu menjadi keputusan engineering yang bisa diaudit. Sistem menjalankan test, mengambil evidence, membaca OpenSpec sebagai source of truth, meminta OpenAI memberi verdict terstruktur, lalu membuktikan HEAL lewat browser validation, controlled test-file patch, dan rerun proof. Hasil yang actionable masuk ke Jira, sementara report lengkap tersimpan di PostgreSQL.

## Core Thesis

> Test hijau saja tidak cukup. Yang dibutuhkan tim adalah recovery decision yang bisa dipercaya.

SpecHeal bukan blind self-healing. SpecHeal adalah evidence-backed recovery.

## Positioning

SpecHeal sits between:

- Playwright test execution
- OpenSpec behavior contract
- OpenAI failure analysis
- Jira engineering workflow
- PostgreSQL audit history

SpecHeal is not:

- a generic test runner
- a product bug fixer
- a replacement for QA
- a blind selector self-healing tool
- an arbitrary website testing platform

## Audience

Primary pitch audience:

- Refactory Hackathon judges
- mentors
- technical reviewers
- engineering stakeholders

Primary product user:

- QA Engineer

Secondary recipients:

- frontend developer
- engineering lead
- product stakeholder

## Desired Audience Reaction

The audience should think:

- "I have seen this problem in real engineering teams."
- "The project is more than a demo UI."
- "OpenSpec is used in the actual product logic, not just documentation."
- "The AI is not trusted blindly."
- "The team understands the risk of false green."
- "This is scoped tightly enough to be real, but valuable enough to matter."

## Narrative Arc

### Act 1 - Automation Is Critical

Modern engineering teams need automated regression suites to ship quickly.

### Act 2 - Trust Is Breaking

CI failures often come from brittle tests, not product bugs. Teams lose time and stop trusting automation.

### Act 3 - Locator Drift Explains The Pain

UI implementation changes can break selectors even when user-visible behavior is still correct.

### Act 4 - Blind Self-Healing Is Not Enough

Self-healing can hide real product bugs and create false green.

### Act 5 - SpecHeal Adds Guardrails

SpecHeal uses OpenSpec as source of truth, OpenAI as reasoning engine, and browser proof as safety gate.

### Act 6 - The Demo Proves The Loop

Healthy Flow produces audit report. Locator Drift becomes safe HEAL. Product Bug becomes Jira Bug.

## Main Message Hierarchy

1. Automation testing is mandatory.
2. Test failures are losing meaning.
3. Locator drift wastes engineering time.
4. Blind self-healing can create false green.
5. OpenSpec gives SpecHeal a behavior source of truth.
6. OpenAI helps classify failure, but proof gates make it safe.
7. Jira makes the output actionable.
8. PostgreSQL keeps the decision auditable.
9. Kubernetes shows deployment readiness.

## Deck Personality

The deck should feel:

- calm but urgent
- technical but clear
- data-backed but not academic
- honest but confident
- product-focused, not code-focused
- polished enough for Canva

## Best Framing Lines

Use these lines in the deck or speaker notes:

- "CI merah kehilangan makna ketika tim tidak tahu apakah produk rusak atau test yang rusak."
- "False green lebih berbahaya daripada red build."
- "SpecHeal tidak bertanya: selector baru apa yang bisa membuat test hijau? SpecHeal bertanya: behavior mana yang benar menurut spec?"
- "OpenSpec menjadi source of truth. OpenAI memberi verdict. Browser proof menentukan apakah verdict itu aman."
- "Healthy run menjadi audit report. Locator drift menjadi Jira Task. Product bug menjadi Jira Bug."

## What Must Be Memorable

The audience should remember:

- problem: automation trust crisis
- risk: false green
- differentiation: OpenSpec + OpenAI + proof gates
- demo: ShopFlow Checkout
- output: Jira and audit report

