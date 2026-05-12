## ADDED Requirements

### Requirement: DOM cleaning audit evidence
The system SHALL retain audit metadata describing how DOM evidence was cleaned before AI analysis.

#### Scenario: DOM is cleaned for failed run
- **WHEN** a Playwright checkout attempt fails
- **THEN** the evidence includes raw DOM length, cleaned DOM length, cleaned DOM excerpt, and a summary of removed DOM noise
- **AND** sensitive values are masked before the cleaned DOM is included in prompts or reports

#### Scenario: DOM is too large for prompt budget
- **WHEN** cleaned DOM exceeds the configured prompt budget
- **THEN** the cleaned DOM is truncated with an explicit truncation marker
- **AND** the recorded cleaned DOM length reflects the truncated payload sent for analysis

### Requirement: Visible evidence summary
The system SHALL capture visible page evidence that explains what a user or QA reviewer would have seen at failure time.

#### Scenario: Failed run captures visible evidence
- **WHEN** failure evidence is captured
- **THEN** the report includes page title, page URL, visible body text, payment-related section text when available, visible error text when available, candidate count, and evidence notes

#### Scenario: No valid candidate exists
- **WHEN** candidate extraction finds zero valid payment candidates
- **THEN** the visible evidence notes explicitly state that no valid visible/enabled candidates were found

### Requirement: AI prompt grounding uses visible evidence
The system SHALL include visible evidence and DOM cleaning metadata in the OpenAI verdict prompt.

#### Scenario: Failed run invokes OpenAI
- **WHEN** OpenAI recovery analysis is requested
- **THEN** the prompt includes OpenSpec context, Playwright error, visible evidence summary, DOM cleaning metadata, cleaned DOM excerpt, and ranked candidate elements

### Requirement: AI usage and cost transparency
The system SHALL expose token usage and estimated OpenAI cost when usage metadata is available.

#### Scenario: OpenAI returns usage metadata
- **WHEN** OpenAI returns usage metadata for a failed-run verdict
- **THEN** the run report shows prompt tokens, cached prompt tokens when available, completion tokens, total tokens, estimated cost, and pricing source

#### Scenario: Cost detail is displayed
- **WHEN** token counts and known model pricing are available
- **THEN** the report displays input, cached input, and output cost components where possible
- **AND** the UI labels the cost as an estimate rather than an invoice
