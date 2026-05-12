# Problem Evidence And Why Now

This file is the main source for problem slides. NotebookLM must show selected data points directly on the slides.

## Problem Thesis

Automation testing is no longer optional, but automation trust is breaking.

The issue is not simply "tests fail." The issue is that teams often cannot tell what a failure means.

> CI merah kehilangan makna ketika tim tidak tahu apakah produk rusak atau test yang rusak.

## Layer 1: Automation Testing Is Now Mandatory

Modern software teams rely on automated testing because they need fast feedback and confidence before shipping.

Use these data points:

- 77% software companies have adopted automated testing in some form.
- Test automation market is estimated around $29.29B in 2025.
- Successful Agile teams using automation report 30-50% higher productivity and 2-3x faster time-to-market.

Slide implication:

Automation testing is not a side feature. It is delivery infrastructure.

Recommended on-slide framing:

> Automation testing sudah menjadi fondasi delivery modern.

Suggested visual:

- dark background
- central "Regression Suite" block
- three metrics around it: 77%, $29.29B, 2-3x faster
- cyan lines show automation as engineering infrastructure

## Layer 2: Test Failures Are Losing Meaning

The pain starts when a red pipeline no longer clearly means product regression.

Use these data points:

- Google found 84% CI failures were not caused by product bugs, but brittle tests.
- Slack reported 56.76% CI failures from unstable tests before dedicated remediation.
- 40% QA team time can go to test maintenance instead of finding bugs.
- Atlassian reportedly spent more than 150,000 developer hours per year handling this class of issue.

Slide implication:

Red CI becomes noisy. Teams spend time interpreting signals instead of fixing real problems.

Recommended on-slide framing:

> CI merah tidak selalu berarti product bug.

Suggested visual:

- one large red CI alert in the center
- split into three possible causes: Product Bug, Flaky Test, Locator Drift
- amber warning label: "Trust gap"

## Layer 3: Locator Drift Is A Common Root Cause

Locator drift happens when UI implementation changes but user-visible behavior still works.

Use these data points:

- 15-25% of test suites can fail per sprint due to locator changes.
- QA teams may spend around 2 days per sprint fixing tests broken by locator changes.

Concrete example to show in the deck:

```ts
await page.click("#pay-now");
```

The product UI still works, but implementation changed:

```html
<button data-testid="complete-payment">Pay Now</button>
```

From the user's perspective, checkout still works.

From CI's perspective, the test is red.

From the team's perspective, time is wasted.

Recommended on-slide framing:

> Behavior benar. Selector berubah. Pipeline merah.

Suggested visual:

- left side: old test selector `#pay-now` with red X
- right side: visible Pay Now button still available
- bottom label: "Locator drift, not product bug"

## Layer 4: Blind Self-Healing Can Make It Worse

AI self-healing tries to keep tests running by finding replacement elements. That sounds useful, but it can become dangerous if it only optimizes for making the test pass.

Use these data points:

- Some self-healing implementations report 23% higher false positive rate.
- Teams can spend 31% more debugging time due to AI-introduced fixes.
- Selector-only healing can cover only part of the failure space, such as 28% of test failure types.

Key risk:

> False green is more dangerous than red CI.

Scenario:

The real "Pay Now" button is gone because of product regression. A blind self-healing tool finds another similar-looking element and clicks it. The test passes. The bug goes to production.

Recommended on-slide framing:

> Test hijau belum tentu produk benar.

Suggested visual:

- green CI badge with red shadow behind it
- wrong element highlighted
- label: "False green"

## The Gap

Existing approaches often answer:

> Selector baru apa yang bisa membuat test hijau?

SpecHeal answers:

> Apakah behavior produk masih benar menurut OpenSpec?

This is the transition into the solution.

## Problem Slide Guidance

The deck should spend 4-5 slides on problem before solution:

1. Automation testing is now mandatory.
2. Test failures are losing meaning.
3. Locator drift explains the daily pain.
4. Blind self-healing creates false green risk.
5. The real question: drift, bug, or outdated spec?

Keep the data visible on slides, but avoid overcrowding. Use one main claim and 1-3 supporting numbers per slide.

## Source Links

Use these as supporting references, especially in speaker notes or appendix:

- Testlio test automation statistics: https://testlio.com/blog/test-automation-statistics/
- Katalon test automation statistics: https://katalon.com/resources-center/blog/test-automation-statistics-for-2025
- Slack Engineering flaky tests article: https://slack.engineering/handling-flaky-tests-at-scale-auto-detection-suppression/
- Datadog flaky tests knowledge center: https://www.datadoghq.com/knowledge-center/flaky-tests/
- Karate Labs locator drift article: https://karatelabs.io/blog/end-of-locator-hell
- BugBug self-healing article: https://bugbug.io/blog/test-automation/self-healing-test-automation/
- QA Wolf self-healing test automation article: https://www.qawolf.com/blog/self-healing-test-automation-types

