## ADDED Requirements

### Requirement: Jira configuration
The system SHALL support Jira Cloud configuration through server-side environment variables.

#### Scenario: Jira configuration is available
- **WHEN** the application starts with Jira environment variables configured
- **THEN** the system can identify Jira site URL, email, API token, project key, Task issue type, and Bug issue type

#### Scenario: Jira configuration is missing
- **WHEN** required Jira configuration is missing
- **THEN** the dashboard shows Jira as not ready and terminal runs record Jira publish failure instead of hiding the problem

### Requirement: Automatic Jira publishing for terminal runs
The system SHALL attempt to publish every terminal run result to Jira automatically.

#### Scenario: Successful run is published
- **WHEN** a run reaches terminal verdict `NO_HEAL_NEEDED`
- **THEN** the system automatically attempts to create a Jira Task documenting the successful/audit result

#### Scenario: Heal run is published
- **WHEN** a run reaches terminal verdict `HEAL`
- **THEN** the system automatically attempts to create a Jira Task for reviewing and applying the safe patch

#### Scenario: Product bug run is published
- **WHEN** a run reaches terminal verdict `PRODUCT BUG`
- **THEN** the system automatically attempts to create a Jira Bug for fixing the product regression

#### Scenario: Spec outdated run is published
- **WHEN** a run reaches terminal verdict `SPEC OUTDATED`
- **THEN** the system automatically attempts to create a Jira Task for updating test or spec mapping

#### Scenario: Operational error run is published
- **WHEN** a run reaches terminal error status before a recovery verdict is available
- **THEN** the system automatically attempts to create a Jira Task for investigating the SpecHeal run failure

### Requirement: Jira issue type mapping
The system SHALL map SpecHeal terminal results to Jira issue types.

#### Scenario: Task issue type is used for non-bug actions
- **WHEN** the terminal result is `NO_HEAL_NEEDED`, `HEAL`, `SPEC OUTDATED`, or operational error
- **THEN** the Jira issue uses the configured Task issue type

#### Scenario: Bug issue type is used for product regression
- **WHEN** the terminal result is `PRODUCT BUG`
- **THEN** the Jira issue uses the configured Bug issue type

### Requirement: Jira payload content
The system SHALL include enough recovery context in each Jira issue for a developer or QA engineer to act.

#### Scenario: Jira issue contains common run fields
- **WHEN** the system creates any Jira issue
- **THEN** the issue includes SpecHeal run ID, scenario name, terminal result, summary, reason, OpenSpec reference, and dashboard report reference when available

#### Scenario: Jira issue contains HEAL proof
- **WHEN** the system creates a Jira issue for `HEAL`
- **THEN** the issue includes patch preview, candidate selector, validation result, rerun result, and AI confidence

#### Scenario: Jira issue contains product bug evidence
- **WHEN** the system creates a Jira issue for `PRODUCT BUG`
- **THEN** the issue includes failed selector, visible evidence, zero-candidate evidence when applicable, OpenSpec behavior violated, and recommended action

#### Scenario: Jira issue contains operational error details
- **WHEN** the system creates a Jira issue for an operational run error
- **THEN** the issue includes failed stage, error message, scenario, and recommended retry or configuration action

### Requirement: Jira description format
The system SHALL create Jira issue descriptions in a Jira Cloud-compatible format.

#### Scenario: Jira description uses Atlassian Document Format
- **WHEN** the system sends a create issue request to Jira Cloud
- **THEN** the description is encoded as Atlassian Document Format

#### Scenario: Jira labels are included
- **WHEN** the system sends a create issue request
- **THEN** the issue includes labels for `specheal`, `ai-recovery`, `playwright`, and the scenario or terminal result

### Requirement: Jira publish result persistence
The system SHALL persist the result of each Jira publish attempt.

#### Scenario: Jira publish succeeds
- **WHEN** Jira returns a created issue
- **THEN** the run stores Jira issue key, issue URL, issue ID if available, publish status, and publish timestamp

#### Scenario: Jira publish fails
- **WHEN** Jira create issue fails because of configuration, permission, network, validation, or rate limit error
- **THEN** the run stores publish status `jira_publish_failed`, error code or message, and enough context for retry

### Requirement: Jira publish retry
The system SHALL allow retrying Jira publishing for runs whose issue was not created.

#### Scenario: Retry failed publish
- **WHEN** a user retries Jira publish for a run with `jira_publish_failed`
- **THEN** the system sends a new create issue request using the stored run report and current Jira configuration

#### Scenario: Retry is not duplicated after success
- **WHEN** a run already has a successful Jira issue key
- **THEN** the system does not create a duplicate issue unless explicitly implemented as a separate future action

### Requirement: Jira failure transparency
The system SHALL be honest when Jira publishing cannot create an issue.

#### Scenario: Jira unavailable
- **WHEN** Jira is unreachable or credentials are invalid
- **THEN** the dashboard displays the Jira publish error and does not claim that the run entered Jira

#### Scenario: Run report remains available after Jira failure
- **WHEN** Jira publishing fails
- **THEN** the run report remains available in SpecHeal with all recovery evidence and a visible retry path

### Requirement: Jira publishing does not block run report persistence
The system SHALL persist the SpecHeal run report even if Jira publishing fails.

#### Scenario: Report is saved before or despite publish failure
- **WHEN** a run reaches terminal state and Jira publishing fails
- **THEN** the recovery report remains stored in PostgreSQL

#### Scenario: User can inspect failed publish run
- **WHEN** a user opens a run whose Jira publish failed
- **THEN** the full report displays recovery result, evidence, AI trace, and Jira publish failure details
