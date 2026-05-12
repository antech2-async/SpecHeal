## ADDED Requirements

### Requirement: Active run progress experience
The system SHALL show a distinct in-progress dashboard experience while a recovery run is pending or running.

#### Scenario: Run starts
- **WHEN** a user starts a selected scenario
- **THEN** the dashboard disables duplicate run submission for the active run
- **AND** the primary action communicates that SpecHeal is running
- **AND** the current run area shows a staged recovery progress view

#### Scenario: Run remains active during polling
- **WHEN** a run remains in `pending` or `running` status after the create request returns
- **THEN** the dashboard continues to show the in-progress state until the run reaches a terminal status

### Requirement: Demo status strip
The system SHALL expose the active demo context as a compact status strip near the top of the cockpit.

#### Scenario: Dashboard context is visible
- **WHEN** a user opens the dashboard
- **THEN** the dashboard shows the selected scenario, expected decision, target route, and current run state without requiring the user to inspect the detailed report

#### Scenario: Run state changes
- **WHEN** the active run moves from ready to running or terminal
- **THEN** the status strip updates its run-state label to match the current dashboard state

### Requirement: Recovery story hierarchy
The system SHALL prioritize the recovery story before deep diagnostic details.

#### Scenario: Result displayed on dashboard
- **WHEN** a run reaches a terminal status
- **THEN** the dashboard shows verdict, decision summary, timeline, and proof/Jira outcome as the primary reading path
- **AND** detailed evidence, prompts, raw responses, and code-like artifacts are available without overwhelming the first view

#### Scenario: Full report displayed
- **WHEN** a user opens a full report
- **THEN** the report preserves complete audit evidence
- **AND** the layout makes the main recovery sequence easier to scan than raw diagnostic payloads

### Requirement: First-class AI trace inspection
The system SHALL expose AI trace data through an organized audit surface.

#### Scenario: Trace is available
- **WHEN** a run has AI trace data
- **THEN** the UI shows model usage, cost metadata, prompt content, raw response, parsed response, and validation context in organized sections

#### Scenario: Trace is unavailable
- **WHEN** AI trace data is unavailable because the run was healthy, skipped, or failed before OpenAI
- **THEN** the UI clearly explains why no AI trace exists

#### Scenario: Trace opens as drawer
- **WHEN** a user opens AI trace inspection from a run report
- **THEN** the trace appears as a drawer or modal audit surface with clear close behavior
- **AND** the report remains readable without large prompt or raw response blocks occupying the main report by default

### Requirement: Refined cockpit visual hierarchy
The system SHALL present the cockpit with polished spacing, typography, and card hierarchy suitable for a judged demo.

#### Scenario: Dashboard is scanned
- **WHEN** a user scans the dashboard on desktop or mobile
- **THEN** primary actions, selected scenario, recent run history, active run story, and detailed evidence have visually distinct priority

#### Scenario: Terminal result is scanned
- **WHEN** a terminal run report is displayed
- **THEN** the verdict, proof, timeline, Jira status, and trace action are visually prominent before low-level diagnostic panels

### Requirement: ShopFlow interaction feedback
The ShopFlow checkout demo SHALL provide visible loading and payment-processing feedback without changing scenario semantics.

#### Scenario: Checkout loads
- **WHEN** the ShopFlow checkout route is opened
- **THEN** the page shows a short loading or preparing state before the checkout controls become available

#### Scenario: Payment is submitted
- **WHEN** the healthy or locator-drift payment action is clicked
- **THEN** the payment action shows processing feedback before the success state is displayed

#### Scenario: Product bug state remains unavailable
- **WHEN** the ShopFlow product bug state is opened
- **THEN** the page continues to show that payment is unavailable
- **AND** no valid payment action is introduced by the loading or processing feedback

### Requirement: Recent run polish
The system SHALL present recent runs as a compact navigation aid instead of competing with the active run.

#### Scenario: Recent runs exist
- **WHEN** recent persisted runs are available
- **THEN** the dashboard shows them with verdict, scenario, time, and candidate/Jira signal when available
- **AND** the presentation remains visually secondary to scenario selection and the active run

### Requirement: Production API browser compatibility
The system SHALL allow the deployed dashboard to call SpecHeal API routes from the browser without private-network preflight failures.

#### Scenario: Browser sends private-network preflight
- **WHEN** a browser sends an `OPTIONS` preflight request to a SpecHeal API route with private-network access headers
- **THEN** the API responds with a successful no-content preflight response
- **AND** the response includes allowed methods, allowed headers, origin, and private-network access headers

#### Scenario: Browser calls API route
- **WHEN** the dashboard calls a SpecHeal API route from the deployed origin
- **THEN** the API response includes browser compatibility headers for origin and private-network access
