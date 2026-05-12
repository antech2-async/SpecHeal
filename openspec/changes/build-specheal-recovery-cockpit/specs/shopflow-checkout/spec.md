## ADDED Requirements

### Requirement: ShopFlow checkout seeded demo
The system SHALL provide a seeded ShopFlow Checkout demo application as the target application under test for SpecHeal.

#### Scenario: Demo target is reachable
- **WHEN** a user opens the ShopFlow Checkout target route
- **THEN** the system displays a checkout page with order details, payment summary, and checkout payment area

#### Scenario: Demo target supports scenario state
- **WHEN** SpecHeal opens ShopFlow Checkout for a selected scenario
- **THEN** the ShopFlow page renders behavior that matches that scenario state

### Requirement: Checkout payment completion
The ShopFlow Checkout application SHALL allow a user with items in the cart to complete payment from the checkout page when payment is available.

#### Scenario: Successful payment
- **WHEN** the checkout page is ready and the user confirms payment
- **THEN** the system displays `Payment Success`

#### Scenario: Completed order feedback
- **WHEN** payment is completed successfully
- **THEN** the system shows a clear success state that can be detected by the recovery test

### Requirement: Payment action availability
The ShopFlow Checkout application SHALL expose a visible and enabled payment confirmation action when checkout payment is available.

#### Scenario: Payment action ready
- **WHEN** a user views checkout with payment available
- **THEN** a payment action is visible, enabled, and communicates payment or checkout intent

#### Scenario: Payment action can be activated
- **WHEN** the visible payment action is clicked
- **THEN** the checkout flow attempts to complete payment

### Requirement: Healthy flow state
The ShopFlow Checkout application SHALL provide a healthy scenario where the expected checkout payment behavior works with the baseline test path.

#### Scenario: Healthy payment succeeds
- **WHEN** SpecHeal runs the Healthy Flow scenario
- **THEN** the checkout test reaches `Payment Success` without recovery

#### Scenario: Healthy flow does not require AI recovery
- **WHEN** the Healthy Flow scenario reaches the expected success outcome on the first execution
- **THEN** SpecHeal can classify the run as `NO_HEAL_NEEDED`

### Requirement: Payment implementation drift state
The ShopFlow Checkout application SHALL provide a drift scenario where the user-visible payment behavior remains correct after implementation changes.

#### Scenario: Changed implementation preserves payment behavior
- **WHEN** the Locator Drift scenario is rendered
- **THEN** the page still contains a visible and enabled payment action that satisfies checkout payment intent

#### Scenario: Drift state can complete payment with replacement action
- **WHEN** a valid replacement payment action is activated in the Locator Drift scenario
- **THEN** the checkout flow reaches `Payment Success`

### Requirement: Product bug state
The ShopFlow Checkout application SHALL provide a product bug scenario where the payment action required by checkout behavior is missing or unavailable.

#### Scenario: Payment action unavailable
- **WHEN** SpecHeal runs the Product Bug scenario
- **THEN** no visible and enabled payment action that satisfies checkout payment intent is available

#### Scenario: Product bug is visible to the user
- **WHEN** payment is unavailable in the Product Bug scenario
- **THEN** the page displays visible evidence that payment cannot be completed

### Requirement: ShopFlow OpenSpec remains selector-agnostic
The ShopFlow Checkout specification SHALL define user-visible checkout behavior without requiring implementation-specific selectors.

#### Scenario: Product behavior is independent from selector implementation
- **WHEN** ShopFlow requirements are used as the recovery source of truth
- **THEN** they describe expected payment behavior and success outcomes without depending on a specific CSS selector or test attribute
