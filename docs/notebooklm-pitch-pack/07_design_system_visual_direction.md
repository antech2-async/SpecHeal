# Design System And Visual Direction

Use this file to guide the Canva visual style.

## Visual Identity

Use this identity:

> Spec-First Technical Manual + Evidence Dossier

This direction combines:

- a clean light-mode modern tech startup deck;
- a premium engineering technical manual;
- evidence dossier components for audit/proof;
- OpenSpec as the central visual artifact.

It should feel professional, distinctive, and credible for hackathon judges.

It should not feel like:

- generic SaaS dashboard;
- cute anime deck;
- character illustration;
- chibi mascot;
- neon cyberpunk dashboard;
- robot/AI-brain illustration;
- corporate stock template;
- academic paper;
- code-only technical talk.

## Core Visual Metaphor

SpecHeal turns messy UI test failures into trusted engineering evidence.

The deck should repeatedly show:

- OpenSpec document artifacts;
- annotation lines;
- evidence dossier cards;
- proof seals;
- selector tags;
- decision matrices;
- verdict stamps;
- Jira handoff notes;
- technical manual panel borders.

## Color System

Use this as the primary color system:

| Role | Color | Hex |
| --- | --- | --- |
| Background | White | `#FFFFFF` |
| Alternate background | Warm Paper | `#F4F1EA` |
| Surface / card | Soft Ash | `#F7F8FA` |
| Text utama | Slate Dark | `#1E293B` |
| Muted text | Slate Muted | `#64748B` |
| Primary accent | Electric Blue | `#2563EB` |
| Broken / pain | Amber Orange | `#F97316` |
| Healed / proof passed | Emerald | `#10B981` |
| Product bug / unsafe | Red | `#DC2626` |
| OpenSpec source stamp | Gold | `#C98A12` |
| Validation / AI signal | Cyan Teal | `#0E9FB0` |
| Soft border | Ash Border | `#E2E8F0` |

## Color Semantics

Use colors consistently:

- Amber = broken test, needs attention, CI pain.
- Emerald = healed, proof passed, safe recovery.
- Red = product bug, unsafe to heal, false green risk.
- Electric Blue = primary system/action/link.
- Gold = OpenSpec source of truth.
- Cyan Teal = validation, AI signal, proof connector.

Do not use all colors on every slide. Most slides should be white/soft ash/slate with one accent.

## Typography

Recommended:

- Heading / Slide Title: Syne Bold 800.
- Body / Keterangan: DM Sans Regular.
- Code / OpenSpec snippet: DM Mono.

Use DM Mono for:

- selectors;
- OpenSpec snippets;
- verdict labels;
- model names;
- small technical callouts.

Do not overuse monospace for long paragraphs.

## Layout Principles

- White space is power.
- One slide = one message.
- Judge should understand the slide in 3 seconds.
- Use diagrams over long text.
- Use technical manual panels, not busy dashboards.
- Use code snippets only when they increase credibility.
- Keep problem data visible on slides.
- Keep architecture simple and pitch-friendly.

## Visual Components

### OpenSpec Document Artifact

Hero asset for cover and solution slides:

- clean document card;
- title `OpenSpec`;
- 2-3 requirement rows;
- annotation lines;
- small `SOURCE OF TRUTH` stamp in Gold;
- proof seal near the lower corner;
- optional selector tags peeking from the side.

This is the strongest visual motif. Use it repeatedly.

### Evidence Dossier Card

Case-file style card with:

- failure title;
- screenshot thumbnail;
- failed selector;
- candidate count;
- OpenSpec clause snippet;
- status chip;
- proof seal or issue label.

The card should feel like an audit-ready evidence packet, not a random dashboard widget.

### Proof Seal

Small stamp/seal used after validated stages:

- `SOURCE OF TRUTH`;
- `VALIDATED`;
- `RERUN PASSED`;
- `JIRA READY`.

Keep seals small and controlled.

### Selector Tag

Use for locator drift slide:

```ts
#pay-now
```

and:

```html
data-testid="complete-payment"
```

Style:

- small rounded tag;
- DM Mono;
- amber/red mark for failed selector;
- emerald/cyan seal for verified selector.

### Decision Matrix

Use a clean 2x2 matrix:

- Healthy;
- Locator Drift;
- Product Bug;
- Spec Outdated.

Each cell should have:

- one status dot;
- one verdict label;
- one short explanation.

### Proof Pipeline

Horizontal flow:

Evidence -> OpenSpec -> OpenAI -> Validation -> Patch -> Rerun -> Jira

Use:

- thin connector line;
- Electric Blue for system path;
- Cyan Teal for validation;
- Emerald for passed proof;
- Amber for pending/attention.

### False Green Visual

Show one green check with a thin red offset shadow or warning outline.

Message:

> Test hijau belum tentu produk benar.

This slide may use charcoal background for contrast, but keep it minimal.

## Slide Template Families

### Cover

- White or warm paper background.
- Large `SpecHeal` title.
- Subtitle: `Evidence-backed test recovery`.
- One OpenSpec document artifact as hero.
- `SOURCE OF TRUTH` stamp.
- Minimal proof seals.

### Problem Metrics

- One headline.
- 2-3 metric cards.
- One small evidence/footnote line.
- No long paragraph.

### Problem Example

- Two selector tags.
- One short explanation.
- One visible data point.

### Solution Mechanism

- OpenSpec document artifact at center.
- Inputs left, outputs right.
- Annotation lines show reasoning.

### Demo Outcomes

- Three evidence dossier cards:
  - Healthy Flow;
  - Locator Drift;
  - Product Bug.

### Technical Proof

- Three-column technical manual:
  - Runtime;
  - Intelligence + Proof;
  - Workflow + Persistence.

## Cover Direction

The preferred cover style:

- clean light mode;
- large confident typography;
- OpenSpec document artifact;
- source-of-truth stamp;
- proof seal;
- maybe tiny selector tags;
- no characters;
- no neon;
- no fake AI network;
- no crowded UI.

The cover should look like a premium technical manual page for a serious software product.

