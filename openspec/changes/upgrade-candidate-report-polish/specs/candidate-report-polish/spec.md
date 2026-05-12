## ADDED Requirements

### Requirement: Explainable candidate ranking
The system SHALL capture candidate context sufficient for reviewers to understand why a selector candidate was ranked.

#### Scenario: Failed run extracts candidates
- **WHEN** candidate extraction runs after a Playwright failure
- **THEN** each candidate includes stable locator suggestions, role/type metadata, visible text, nearby label or container context when available, visibility/enabled state, rank score, and ranking signal breakdown

#### Scenario: Candidate is sent to OpenAI
- **WHEN** a failed run invokes OpenAI recovery analysis
- **THEN** candidate payload includes suggested locators and ranking signals
- **AND** OpenAI is still constrained to choose only from provided candidate selectors

### Requirement: Candidate evidence display
The system SHALL show candidate ranking evidence in the cockpit and full report.

#### Scenario: Candidate list is available
- **WHEN** a run report contains candidates
- **THEN** the evidence panel shows score, selector kind, selector, rank reason, suggested locators, and contextual evidence for the top candidates

#### Scenario: No candidates are available
- **WHEN** no candidates are found
- **THEN** the evidence panel keeps the zero-candidate state explicit and explains that healing is unsafe

### Requirement: Copy-ready recovery handoff
The system SHALL provide copy-friendly report blocks for reviewer handoff.

#### Scenario: Final output exists
- **WHEN** a run has a final decision output
- **THEN** the report offers copy-ready summary text containing title, summary, recommended action, evidence, and safety note

#### Scenario: Patch exists
- **WHEN** a run has a safe heal patch
- **THEN** the report offers a copy-ready patch diff block

#### Scenario: Jira publish exists
- **WHEN** Jira publishing has a result
- **THEN** the report shows publish status and copy-ready Jira output context without replacing live Jira publishing
