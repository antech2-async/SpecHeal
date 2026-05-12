## MODIFIED Requirements

### Requirement: Rerun proof from patched test file
The system SHALL rerun the checkout test through the patched Playwright test file before presenting a safe patch.

#### Scenario: Rerun uses canonical click patch
- **WHEN** candidate validation passes for a `HEAL` verdict
- **THEN** the system generates the executable Playwright patch line from the validated selector
- **AND** the generated line clicks the payment action
- **AND** OpenAI-provided patch text is not used as the authoritative executable line

#### Scenario: Rerun recovers from prior malformed runtime patch
- **WHEN** the controlled runtime test file no longer contains the original checkout action line
- **THEN** the system repairs the known ShopFlow action region before applying the canonical patch
- **AND** rerun proof still executes from the controlled test file

#### Scenario: Rerun blocks unsafe patch
- **WHEN** rerun does not reach `Payment Success`
- **THEN** the system does not present the patch as a safe heal
- **AND** the report explains that patch preview is blocked until rerun proof passes
