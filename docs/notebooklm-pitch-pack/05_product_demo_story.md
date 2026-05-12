# Product And Demo Story

## Demo Thesis

The demo should prove one idea:

> SpecHeal does not make every failed test green. SpecHeal decides what the failure means.

## Demo Characters

### QA Engineer

Runs the recovery scenario from the dashboard and reviews the output.

### ShopFlow Checkout

Seeded checkout demo application used as the system under test.

### SpecHeal

Recovery cockpit that executes the test, captures evidence, calls OpenAI, validates proof, stores report, and publishes Jira issue.

### Jira

Action tracking surface for developers.

## Demo Flow

### Part 1 - Open Dashboard

Show:

- project readiness cards: OpenAI, PostgreSQL, Jira, Playwright;
- active project: ShopFlow Checkout;
- scenario picker;
- recent runs.

Audience takeaway:

This is a real runtime product, not only slides.

### Part 2 - Healthy Flow

Run Healthy Flow.

Expected outcome:

- Playwright reaches `Payment Success`;
- verdict `NO_HEAL_NEEDED`;
- AI recovery is skipped;
- Jira is not required;
- report is stored.

Audience takeaway:

SpecHeal does not force every run through AI. Healthy runs become audit reports.

### Part 3 - Locator Drift

Run Locator Drift.

Story:

- baseline selector `#pay-now` fails;
- payment behavior still exists;
- OpenSpec says checkout must expose payment action and reach `Payment Success`;
- OpenAI classifies this as `HEAL`;
- SpecHeal validates candidate selector;
- SpecHeal applies controlled locator patch;
- patched rerun reaches `Payment Success`;
- Jira Task is created.

Audience takeaway:

This is safe recovery, not blind self-healing.

### Part 4 - Product Bug

Run Product Bug.

Story:

- baseline selector fails;
- required payment action is missing or unavailable;
- OpenSpec behavior is violated;
- OpenAI classifies this as `PRODUCT BUG`;
- SpecHeal does not generate a safe patch;
- Jira Bug is created.

Audience takeaway:

SpecHeal protects against false green.

### Part 5 - Full Report

Open a full report.

Show:

- timeline;
- screenshot evidence;
- candidate list;
- OpenSpec clause;
- AI trace;
- proof details;
- Jira status.

Audience takeaway:

The decision is auditable.

## What The Audience Should See

The demo visuals should show:

- dashboard feels like cockpit;
- evidence is visible, not hidden in logs;
- OpenSpec clause is part of the report;
- AI trace exists;
- HEAL has proof;
- PRODUCT BUG has no patch;
- Jira has actionable output;
- PostgreSQL-backed recent runs survive page reload.

## 5-6 Minute Pitch Timing

### 0:00-0:25 - Hook

"Masalah terbesar automation testing bukan test yang gagal, tapi failure yang tidak bisa dipercaya."

### 0:25-1:45 - Problem

Explain automation is mandatory, CI failure is noisy, locator drift wastes time, and blind self-healing can create false green.

### 1:45-2:20 - Solution

Introduce SpecHeal as evidence-backed recovery cockpit with OpenSpec as source of truth.

### 2:20-3:00 - Product Loop

Walk through evidence -> OpenSpec -> OpenAI -> validation -> patch -> rerun -> Jira.

### 3:00-4:15 - Demo Story

Show the three scenario structure: Healthy Flow, Locator Drift, Product Bug.

### 4:15-5:10 - Technical Proof

Show stack: Playwright, OpenAI, PostgreSQL, Jira, Kubernetes, OpenSpec.

### 5:10-5:45 - Close

"SpecHeal turns failed tests into trusted engineering decisions."

## Demo Script

Use this as a speaker note base:

"Kita mulai dari problem yang sangat familiar di engineering team. Pipeline merah, tapi tim belum tahu apakah produknya rusak atau test-nya yang rapuh. Di UI automation, masalah ini makin sering karena selector bisa berubah walaupun behavior produk masih benar.

SpecHeal mengambil pendekatan yang lebih aman daripada blind self-healing. Kita tidak langsung mencari selector baru supaya test hijau. Kita baca OpenSpec sebagai source of truth, panggil OpenAI untuk verdict, lalu buktiin hasilnya lewat browser validation dan rerun.

Di demo, ada tiga scenario. Healthy Flow menunjukkan bahwa SpecHeal tidak memakai AI kalau test memang sudah sehat. Locator Drift menunjukkan safe HEAL: selector lama gagal, behavior masih ada, patch diterapkan, rerun pass, lalu Jira Task dibuat. Product Bug menunjukkan safety-nya: kalau behavior payment hilang, SpecHeal tidak memaksa test hijau. Output-nya Jira Bug."

## Canva Visual Storyboard

### Frame 1 - Cockpit Overview

Show dashboard with readiness cards and scenario picker.

### Frame 2 - Red CI Signal

Show failed selector, screenshot, and evidence panel.

### Frame 3 - OpenSpec Contract

Show requirement block as source of truth.

### Frame 4 - AI Verdict

Show verdict chip: HEAL or PRODUCT BUG.

### Frame 5 - Proof Gates

Show validation, patch, rerun proof.

### Frame 6 - Jira Handoff

Show Jira Task/Bug card.

