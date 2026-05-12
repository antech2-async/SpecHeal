# NotebookLM Instructions for SpecHeal Pitch Deck

Use this file as the main instruction source when generating the final pitch deck.

## Role

You are an expert hackathon pitch deck strategist, senior product storyteller, senior UI/UX engineer, and AI presentation prompt engineer.

Your job is to create a polished, Canva-ready pitch deck for SpecHeal, an evidence-backed UI test recovery cockpit for engineering teams.

The deck must be understandable for non-technical judges while still credible for technical judges and developers.

## Event Context

Event: Refactory Hackathon 2026 - Telkom Round  
Theme: Engineering Productivity x AI  
Team: Merge Kalau Berani  
Product: SpecHeal  
Deck language: Bahasa Indonesia natural  
Pitch duration: 5-6 minutes for deck, remaining time for live demo  
Recommended deck length: 12 slides

The product should be framed around hackathon foundations:

- OpenSpec as behavior source of truth
- LLM / OpenAI as AI reasoning engine
- Kubernetes deployment
- PostgreSQL persistence
- End-to-end demo with usable product flow

## Goal of the Deck

Make judges feel the urgency of the problem before introducing SpecHeal.

The central message:

> Masalah terbesar dari automation testing bukan test yang gagal. Masalahnya adalah tim tidak tahu kegagalan itu berarti apa.

SpecHeal should be positioned as:

> Not blind self-healing. Evidence-backed test recovery.

The deck should convince judges that:

- Automation testing is already mandatory for modern engineering.
- UI test failure has a trust problem.
- Locator drift wastes time because it looks like product regression.
- Blind self-healing is dangerous because it can create false green.
- OpenSpec gives SpecHeal a source of truth beyond selector guessing.
- Live OpenAI helps classify failures, but proof gates make the result trustworthy.
- The MVP is real: Playwright, OpenAI, PostgreSQL, Jira, Kubernetes, and dashboard/report UX.

## Required Deck Format

Generate a Canva-ready 12-slide pitch deck outline. For each slide, include:

- Slide number
- Slide title
- Main headline
- Short on-slide copy
- Required data point if relevant
- Suggested visual layout
- Speaker notes for a 5-6 minute pitch
- Design notes

Keep slide text concise. Put deeper explanation in speaker notes.

## Preferred 12-Slide Structure

1. Cover - SpecHeal
2. Automation Testing Is Now Mandatory
3. Test Failures Are Losing Meaning
4. The Hidden Cause: Locator Drift
5. The Dangerous Shortcut: Blind Self-Healing
6. The Real Question
7. Solution: SpecHeal
8. How It Works
9. Demo Story
10. Safety Model
11. Technical Proof
12. Closing

## Visual Style

Design direction:

- Spec-First Technical Manual + Evidence Dossier
- Light mode modern tech startup base: white/off-white background, soft ash cards, slate text, confident whitespace
- OpenSpec document artifact as the hero visual language
- Annotation lines, proof seals, evidence dossier cards, selector tags, decision matrix, and Jira handoff note
- Dark slides may appear only as occasional contrast for CI failure or false green risk
- Avoid generic AI gradients, neon networks, robots, anime characters, chibi mascots, fantasy backgrounds, decorative blobs, crowded architecture diagrams, and buzzword-heavy slides
- Make it feel like a premium technical manual / product strategy deck, not a generic SaaS dashboard

Suggested visual language:

- OpenSpec document artifact
- Evidence dossier sheet
- Minimal technical manual panel border
- Locator drift selector tags
- Proof seal and verdict stamp
- Decision matrix as technical classification panel
- Jira handoff note
- Simple Kubernetes runtime map as a technical manual diagram

## Claims To Use

Use these claims confidently:

- SpecHeal is an evidence-backed recovery cockpit for Playwright UI test failures.
- SpecHeal does not blindly heal selectors.
- OpenSpec acts as the behavior source of truth.
- OpenAI classifies failed runs using evidence, candidate context, and OpenSpec.
- HEAL is only trusted after browser validation, controlled test-file patch application, and rerun proof.
- Product bugs are escalated as Jira Bugs, not forced into green tests.
- Healthy runs are persisted as audit reports without creating Jira issues by default.
- Actionable terminal results are published to Jira.
- PostgreSQL stores run history, evidence, AI trace, proof, patch, and Jira publish result.
- The MVP is deployed as a Kubernetes-ready application with PostgreSQL integration.

## Claims To Avoid

Do not say:

- "SpecHeal fixes product bugs automatically."
- "SpecHeal guarantees every test failure can be healed."
- "OpenAI alone decides the final truth."
- "The system is fully autonomous and needs no human review."
- "SpecHeal replaces QA engineers."
- "SpecHeal auto-commits code."
- "SpecHeal is just self-healing testing."
- "All scenarios are supported for arbitrary websites."

Use safer polished language:

- "SpecHeal separates safe locator drift from real product regression."
- "AI proposes a verdict, proof gates decide whether a heal can be trusted."
- "The MVP is intentionally scoped to ShopFlow Checkout for a reliable hackathon demo."
- "Humans still review the patch through the normal engineering workflow."

## Mandatory Narrative

The deck must clearly include this idea:

> False green is more dangerous than red CI, because the team thinks the product is safe when it is not.

It must also include this simplified product loop:

1. Playwright test fails.
2. SpecHeal captures screenshot, DOM, visible text, failed selector, and candidate elements.
3. SpecHeal loads the relevant OpenSpec requirement.
4. OpenAI returns structured verdict: HEAL, PRODUCT BUG, or SPEC OUTDATED.
5. For HEAL, SpecHeal validates the candidate selector in the browser.
6. SpecHeal applies a controlled locator patch to the Playwright test file.
7. SpecHeal reruns the patched test and requires Payment Success.
8. SpecHeal stores a full report in PostgreSQL.
9. SpecHeal publishes actionable results to Jira.

## Output Quality Standard

The final deck should feel like:

- A hackathon-winning product story
- Clear enough for non-technical listeners
- Strong enough for technical judges
- Data-backed without becoming a research report
- Visual enough for Canva
- Honest enough to survive Q&A
- Ambitious without sounding inflated

Do not turn the deck into a PRD summary or code walkthrough. The codebase and OpenSpec are proof points, not the main story.

## Best Prompt To Use In NotebookLM

After uploading all files in this pitch pack, use this prompt:

```text
Buat pitch deck 12 slide yang polished, Canva-ready, dan siap dipakai untuk pitch SpecHeal di Refactory Hackathon.

Audience: judge hackathon, mentor, developer, dan stakeholder non-technical yang perlu paham value produk.
Language: Bahasa Indonesia natural. Gunakan istilah teknis English jika lebih natural, seperti automation testing, flaky test, locator drift, self-healing, false green, source of truth, evidence, verdict, rerun proof, recovery cockpit.
Pitch length: 5-6 menit untuk deck, sisanya dipakai live demo.
Tone: senior, jelas, tajam, tidak lebay, tidak buzzword-heavy, dan demo-ready.

Prioritas narasi:
1. Tekankan problem dulu. Judge harus paham kenapa problem ini urgent.
2. Tampilkan data pendukung problem langsung di slide, bukan hanya di speaker notes.
3. Jelaskan automation testing sudah menjadi fondasi engineering modern.
4. Jelaskan trust crisis: CI merah tidak selalu berarti product bug karena flaky test dan test maintenance.
5. Jelaskan locator drift dengan contoh konkret selector `#pay-now` berubah menjadi `data-testid="complete-payment"`.
6. Jelaskan kenapa blind self-healing berbahaya karena bisa menghasilkan false green.
7. Baru masuk ke solution: SpecHeal sebagai evidence-backed test recovery cockpit.
8. Jelaskan OpenSpec sebagai source of truth untuk membedakan locator drift, product bug, dan spec outdated.
9. Showcase demo MVP: Healthy Flow, Locator Drift, Product Bug, OpenAI verdict, proof, PostgreSQL report, dan Jira handoff.
10. Tampilkan technical proof secara ringkas: Playwright, OpenAI gpt-4o-mini, OpenSpec, PostgreSQL, Jira, Kubernetes.

Gunakan visual style dari source pack:
- Spec-First Technical Manual + Evidence Dossier, bukan generic SaaS dashboard;
- light mode modern tech startup sebagai base: white/off-white, soft ash cards, slate text, banyak whitespace;
- visual utama berupa OpenSpec document artifact dengan annotation lines, source-of-truth stamp, dan proof seals;
- gunakan technical manual panel borders yang tipis dan rapi, bukan komik ramai;
- gunakan proof seal, verdict chip, selector tag, evidence dossier card, decision matrix, dan Jira note sebagai komponen berulang;
- Amber untuk broken/needs attention, Emerald untuk healed/proof passed, Blue untuk primary action/system, Red untuk product bug, Gold untuk OpenSpec source-of-truth;
- dark slide boleh dipakai maksimal 1-2 kali untuk CI failure atau false green, bukan sebagai dasar semua slide;
- jangan pakai karakter anime, chibi, robot, neon cyberpunk, AI brain, background fantasy, atau AI gradient generik.

Untuk setiap slide, berikan:
1. Slide number
2. Slide title
3. Main headline
4. On-slide copy yang singkat tetapi kuat
5. Data point yang harus tampil di slide jika relevan
6. Visual direction untuk Canva
7. Speaker notes untuk pitch 5-6 menit
8. Design notes

Ikuti slide blueprint dari source files. Jangan ubah deck menjadi PRD summary atau code walkthrough. Buat deck terasa seperti product pitch yang kuat, bukan dokumentasi internal.
```
