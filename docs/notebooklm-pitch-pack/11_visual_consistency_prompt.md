# Visual Consistency Prompt - Spec-First Technical Manual

Use this file to keep the final deck visually consistent.

## Final Visual Direction

The deck should use:

> Spec-First Technical Manual + Evidence Dossier

This is a clean light-mode technical product deck with evidence dossier components.

It should be professional and distinctive, not generic SaaS and not anime-themed.

## Core Look

- White or warm off-white background.
- Soft ash cards.
- Slate dark text.
- Lots of whitespace.
- One main artifact per slide.
- OpenSpec document artifact as the hero visual.
- Annotation lines like a technical manual.
- Proof seals and verdict stamps.
- Selector tags and evidence dossier cards.
- Clean decision matrix.
- Minimal shadows.
- No visual clutter.

## Primary Palette

- Background: `#FFFFFF`
- Warm paper: `#F4F1EA`
- Surface / card: `#F7F8FA`
- Text utama: `#1E293B`
- Muted text: `#64748B`
- Primary accent: `#2563EB`
- Broken / pain: `#F97316`
- Healed / proof passed: `#10B981`
- Product bug / unsafe: `#DC2626`
- OpenSpec source stamp: `#C98A12`
- Validation / AI signal: `#0E9FB0`
- Border: `#E2E8F0`

## Typography

- Heading / Slide Title: Syne Bold 800.
- Body / Keterangan: DM Sans Regular.
- Code / OpenSpec snippet: DM Mono.

Use DM Mono only for code, selectors, verdict labels, and technical callouts.

## Reusable Slide Templates

### 1. Technical Manual Cover

Use for cover.

Layout:

- Large `SpecHeal` title left or top-left.
- Subtitle: `Evidence-backed test recovery`.
- One large OpenSpec document artifact.
- Small `SOURCE OF TRUTH` stamp.
- Small proof seal.
- Generous whitespace.

### 2. Metric Dossier

Use for problem slides.

Layout:

- One strong headline.
- 2-3 large metric cards.
- One supporting evidence line.
- Small source note.

### 3. CI Failure Triage

Use for trust crisis.

Layout:

- Red/amber CI failure marker.
- Three cause cards:
  - Product Bug;
  - Flaky Test;
  - Locator Drift.
- Make it look like a triage page, not a monitoring dashboard.

### 4. Locator Drift Comparison

Use for locator drift slide.

Layout:

- Two selector tags side by side.
- Left: `#pay-now` marked failed.
- Right: `data-testid="complete-payment"` marked verified.
- One short line explaining behavior remains correct.

### 5. Decision Matrix

Use for real question and demo outcome slides.

Layout:

- 2x2 matrix:
  - Healthy;
  - Locator Drift;
  - Product Bug;
  - Spec Outdated.
- Each cell has one status dot, one verdict label, and one short explanation.

### 6. Proof Pipeline

Use for how it works.

Layout:

- Horizontal artifact flow:
  - Evidence;
  - OpenSpec;
  - OpenAI Verdict;
  - Validation;
  - Rerun Proof;
  - Jira.
- Use proof seals for validated steps.

### 7. Technical Proof Map

Use for architecture.

Layout:

- Three columns:
  - Runtime;
  - Intelligence + Proof;
  - Workflow + Persistence.
- Keep to 6-7 blocks.
- Use annotation lines and small labels like an engineering manual.

## Visual Negative Prompt

Do not use:

- anime characters;
- chibi mascots;
- robots;
- AI brains;
- neon gradients;
- glowing network mesh;
- random particles;
- fantasy background;
- cyberpunk dashboard;
- fake dense UI panels;
- stock photos;
- decorative 3D objects;
- overly dark slides throughout the whole deck;
- generic blue SaaS template with random cards.

## Canva / NotebookLM Prompt Add-On

Paste this after the main NotebookLM prompt if the visual output still feels generic:

```text
For visual style, use Spec-First Technical Manual + Evidence Dossier.

Do not create a generic SaaS dashboard deck. Do not use anime characters, chibi mascots, robots, AI brains, neon cyberpunk, glowing networks, fantasy backgrounds, or random particles.

Make the deck look like a premium light-mode technical product manual:
- white/off-white backgrounds;
- soft ash cards;
- slate dark typography;
- one main OpenSpec document artifact per key slide;
- annotation lines;
- proof seals;
- verdict stamps;
- selector tags;
- evidence dossier cards;
- clean decision matrix;
- generous whitespace;
- precise grid alignment.

Use Amber for broken/needs attention, Emerald for healed/proof passed, Electric Blue for system/action, Red for product bug, Gold for OpenSpec source-of-truth, and Cyan Teal for validation.

The cover should look like an elegant OpenSpec technical manual page stamped SOURCE OF TRUTH, not an AI-generated poster.
```

