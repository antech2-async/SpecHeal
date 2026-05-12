# Canva Slide Blueprint

This is the recommended final pitch deck structure.

Format: 12 slides  
Pitch duration: 5-6 minutes  
Language: Bahasa Indonesia natural  
Audience: Refactory Hackathon judges, mentor, developer, stakeholder  
Style: Spec-First Technical Manual + Evidence Dossier with clean light-mode startup polish

## Slide 1 - Cover

Title: SpecHeal  
Headline: Not blind self-healing. Evidence-backed test recovery.

On-slide copy:

- Refactory Hackathon 2026
- Engineering Productivity x AI
- Team Merge Kalau Berani

Visual direction:

- Warm off-white background with generous whitespace
- Large OpenSpec document artifact as the hero asset
- Small `SOURCE OF TRUTH` stamp
- Tiny proof seals or selector tags around the artifact
- SpecHeal title large
- Amber source mark and cyan proof mark, used sparingly
- No characters, no neon, no generic AI network

Speaker note:

"SpecHeal adalah recovery cockpit untuk UI test failure. Fokus kami bukan sekadar membuat test hijau, tapi membuat keputusan recovery bisa dipercaya."

## Slide 2 - Automation Testing Is Now Mandatory

Title: Automation Testing  
Headline: Automation testing sudah jadi fondasi delivery modern.

On-slide copy:

- 77% software companies use automated testing.
- Market size estimated around $29.29B in 2025.
- Automation can support 2-3x faster time-to-market.

Data point to show:

77%, $29.29B, 2-3x faster

Visual direction:

- Three soft-ash metric cards arranged on a precise grid
- Small release pipeline line as supporting detail
- Warm neutral background, charcoal type, cyan used only as small signal marker
- Use thin technical-manual panel borders, not a busy comic layout

Speaker note:

"Automation testing bukan lagi eksperimen. Tim engineering butuh regression suite supaya bisa ship cepat tanpa kehilangan confidence."

## Slide 3 - Test Failures Are Losing Meaning

Title: Trust Crisis  
Headline: CI merah tidak selalu berarti product bug.

On-slide copy:

- 84% CI failures at Google were not product bugs.
- 56.76% CI failures at Slack came from unstable tests before remediation.
- 40% QA time can go to test maintenance.

Data point to show:

84%, 56.76%, 40%

Visual direction:

- One clean CI failure case-file sheet
- Three cause tags: Product Bug, Flaky Test, Locator Drift
- Red/amber failure marker, not a full cyber dashboard
- Use technical-manual linework, restrained and minimal

Speaker note:

"Ketika CI merah, tim harus berhenti dan bertanya: ini produk rusak, atau test-nya yang rusak? Di situ engineering time mulai bocor."

## Slide 4 - The Hidden Cause: Locator Drift

Title: Locator Drift  
Headline: Behavior benar. Selector berubah. Pipeline merah.

On-slide copy:

- 15-25% test suite can fail per sprint from locator changes.
- QA teams can spend around 2 days per sprint fixing locator-driven failures.

Code visual:

```ts
await page.click("#pay-now")
```

becomes:

```html
data-testid="complete-payment"
```

Data point to show:

15-25%, 2 days per sprint

Visual direction:

- Split screen: old selector fails, new payment button exists
- Two selector tags on a warm paper background
- Thin proof connector between failed selector and verified selector
- Left tag has subtle amber/red crack mark; right tag has cyan proof seal

Speaker note:

"Dari sisi user, checkout tetap jalan. Dari sisi CI, test gagal. Ini bukan product bug, tapi tim tetap harus investigasi."

## Slide 5 - The Dangerous Shortcut: Blind Self-Healing

Title: False Green  
Headline: Test hijau belum tentu produk benar.

On-slide copy:

- Self-healing can create false positives.
- Some reports show 23% higher false positive rate.
- Debugging can increase when AI introduces the wrong fix.

Data point to show:

23% higher false positive rate, 31% more debugging time, 28% selector-only coverage

Visual direction:

- Minimal charcoal or off-white slide
- One green check with thin red offset shadow
- Small warning caption: "False green"
- Keep it restrained, not dramatic

Speaker note:

"Red build memang mengganggu. Tapi false green lebih berbahaya, karena tim percaya produk aman padahal bug bisa lolos."

## Slide 6 - The Real Question

Title: The Real Question  
Headline: Ini locator drift, product bug, atau spec yang sudah berubah?

On-slide copy:

Blind self-healing asks:

> Selector apa yang bisa membuat test hijau?

SpecHeal asks:

> Behavior apa yang benar menurut OpenSpec?

Visual direction:

- Two-question contrast
- Left: selector guessing
- Right: behavior contract
- OpenSpec document artifact on the right
- Small amber `SOURCE OF TRUTH` mark
- Thin manual-style panel divider between the two questions

Speaker note:

"Di sinilah SpecHeal masuk. Kita tidak mulai dari selector. Kita mulai dari behavior yang diwajibkan oleh spec."

## Slide 7 - Solution: SpecHeal

Title: SpecHeal  
Headline: Recovery cockpit untuk failed UI test yang bisa diaudit.

On-slide copy:

- Captures failure evidence.
- Reads OpenSpec as source of truth.
- Uses OpenAI for structured verdict.
- Proves safe HEAL before Jira handoff.

Visual direction:

- Central SpecHeal evidence dossier stack using document layers
- Inputs: Playwright failure, OpenSpec, evidence
- Outputs: safe patch, bug report, Jira issue, audit report
- Include small proof seals, not decorative icons

Speaker note:

"SpecHeal menggabungkan OpenSpec, OpenAI, browser validation, rerun proof, PostgreSQL, dan Jira menjadi satu workflow recovery."

## Slide 8 - How It Works

Title: Recovery Loop  
Headline: AI proposes. Proof decides.

On-slide copy:

1. Playwright failure
2. Evidence capture
3. OpenSpec requirement
4. OpenAI verdict
5. Browser validation
6. Controlled patch
7. Rerun proof
8. Jira action

Visual direction:

- Horizontal row of small evidence artifact cards
- Evidence -> OpenSpec -> OpenAI -> Validation -> Rerun -> Jira
- Cyan for validated proof, amber for Jira action, green only for passed proof
- Use stamp/seal marks for proof gates

Speaker note:

"OpenAI penting, tapi tidak berdiri sendiri. HEAL baru dianggap aman setelah candidate divalidasi, test file dipatch secara controlled, dan rerun mencapai Payment Success."

## Slide 9 - Demo Story

Title: Demo  
Headline: Tiga scenario, tiga keputusan yang berbeda.

On-slide copy:

| Scenario | Result | Output |
| --- | --- | --- |
| Healthy Flow | NO_HEAL_NEEDED | Audit report |
| Locator Drift | HEAL | Jira Task |
| Product Bug | PRODUCT BUG | Jira Bug |

Visual direction:

- Three vertical cards
- Green, cyan, red states
- Cards should look like technical case records, not dashboard tiles
- Each card gets one small verdict stamp

Speaker note:

"Demo kami sengaja sempit supaya jelas. Healthy Flow membuktikan report-only. Locator Drift membuktikan safe recovery. Product Bug membuktikan safety guardrail."

## Slide 10 - Why This Is Safe

Title: Safety Model  
Headline: SpecHeal tidak memperbaiki produk secara otomatis.

On-slide copy:

- No product-code repair.
- No auto-commit.
- No blind selector guessing.
- HEAL requires validation and rerun proof.
- Product bug becomes Jira Bug, not fake green.

Visual direction:

- Safety checklist
- Red blocked path: blind heal -> false green
- Green safe path: OpenSpec -> proof -> Jira
- Use subtle evidence cards and restrained status colors
- Make it feel like a safety protocol page

Speaker note:

"Safety model-nya jelas: kalau behavior hilang, SpecHeal tidak membuat patch. Kalau OpenAI gagal, kita tidak pakai deterministic fallback. Semua tetap visible di report."

## Slide 11 - Technical Proof

Title: Technical Proof  
Headline: Built as an end-to-end recovery workflow.

On-slide copy:

- Playwright browser runtime
- OpenSpec source loading
- OpenAI `gpt-4o-mini`
- PostgreSQL audit store
- Jira Cloud REST API
- Kubernetes deployment path

Visual direction:

- Simplified technical manual diagram
- 7 blocks max: Dashboard/API, Playwright, OpenSpec, OpenAI, PostgreSQL, Jira, Kubernetes
- Use three grouped columns with thin borders, not a dense C4 map
- Keep diagrams clean, monochrome-first, with small cyan/amber accents

Speaker note:

"Ini bukan mock dashboard. MVP menyimpan evidence, AI trace, validation, patch, rerun result, dan Jira publish result. Semua artefact recovery bisa diaudit."

## Slide 12 - Closing

Title: Closing  
Headline: SpecHeal turns failed tests into trusted engineering decisions.

On-slide copy:

- Red CI becomes clear diagnosis.
- Locator drift becomes safe patch review.
- Product bug becomes actionable Jira Bug.
- Every decision leaves an audit trail.

Final line:

> Dari test failure menjadi keputusan engineering yang bisa dipercaya.

Visual direction:

- Red CI signal transforming into three outcomes: Audit Report, Jira Task, Jira Bug
- Minimal evidence dossier background with subtle paper texture
- Optional small `CASE CLOSED` proof seal, restrained

Speaker note:

"Tujuan SpecHeal sederhana: bukan membuat semua test hijau, tapi memastikan tim tahu kapan test boleh di-heal, kapan produk harus diperbaiki, dan kenapa keputusan itu bisa dipercaya."

## Suggested Slide Timing

| Slide | Time |
| --- | --- |
| 1 | 15 sec |
| 2 | 25 sec |
| 3 | 35 sec |
| 4 | 35 sec |
| 5 | 35 sec |
| 6 | 25 sec |
| 7 | 30 sec |
| 8 | 35 sec |
| 9 | 35 sec |
| 10 | 30 sec |
| 11 | 30 sec |
| 12 | 20 sec |

Total: approximately 5-6 minutes
