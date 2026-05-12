"use client";

import { useState } from "react";
import type { ShopFlowScenario } from "@/demo/shopflow";

type ShopFlowCheckoutProps = {
  scenario: ShopFlowScenario;
};

const orderItems = [
  {
    name: "Refactory Hoodie",
    variant: "Midnight / L",
    quantity: 1,
    price: 420000
  },
  {
    name: "Spec Notebook",
    variant: "Dot grid",
    quantity: 2,
    price: 85000
  }
];

const subtotal = orderItems.reduce(
  (total, item) => total + item.quantity * item.price,
  0
);
const shipping = 24000;
const service = 9000;
const total = subtotal + shipping + service;

const formatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0
});

export function ShopFlowCheckout({ scenario }: ShopFlowCheckoutProps) {
  const [paid, setPaid] = useState(false);

  if (paid) {
    return (
      <main className="shopflowShell">
        <section className="successPanel" aria-live="polite">
          <p className="shopflowEyebrow">ShopFlow Checkout</p>
          <h1>Payment Success</h1>
          <p>
            Order SF-2048 is paid and ready for fulfillment. This success state
            is the expected checkout outcome used by SpecHeal rerun proof.
          </p>
          <a className="shopflowLink" href={`/shopflow?state=${scenario.runtimeState}`}>
            Reset checkout
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="shopflowShell">
      <header className="shopflowHeader">
        <div>
          <p className="shopflowEyebrow">ShopFlow Checkout</p>
          <h1>Review and pay</h1>
          <p>
            Complete payment for a seeded checkout order. The page state is
            controlled by SpecHeal scenarios.
          </p>
        </div>
        <div className="scenarioBadge">
          <span>{scenario.title}</span>
          <strong>{scenario.label}</strong>
        </div>
      </header>

      <section className="checkoutGrid" aria-label="Checkout workspace">
        <section className="orderPanel" aria-labelledby="order-summary">
          <h2 id="order-summary">Order details</h2>
          <div className="itemList">
            {orderItems.map((item) => (
              <article className="shopItem" key={item.name}>
                <div className="itemThumb" aria-hidden="true">
                  {item.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div>
                  <h3>{item.name}</h3>
                  <p>
                    {item.variant} - Qty {item.quantity}
                  </p>
                </div>
                <strong>{formatter.format(item.quantity * item.price)}</strong>
              </article>
            ))}
          </div>
        </section>

        <aside className="paymentPanel" aria-labelledby="payment-summary">
          <h2 id="payment-summary">Payment summary</h2>
          <dl className="totals">
            <div>
              <dt>Subtotal</dt>
              <dd>{formatter.format(subtotal)}</dd>
            </div>
            <div>
              <dt>Shipping</dt>
              <dd>{formatter.format(shipping)}</dd>
            </div>
            <div>
              <dt>Service fee</dt>
              <dd>{formatter.format(service)}</dd>
            </div>
            <div className="totalRow">
              <dt>Total</dt>
              <dd>{formatter.format(total)}</dd>
            </div>
          </dl>

          <section className="paymentAction" aria-label="Checkout payment area">
            <p className="paymentIntent">
              Payment is available after order review and customer confirmation.
            </p>
            {scenario.runtimeState === "bug" ? (
              <div className="paymentUnavailable" role="alert">
                <strong>Payment system unavailable.</strong>
                <span>
                  The checkout payment action cannot be completed right now.
                </span>
              </div>
            ) : scenario.runtimeState === "drift" ? (
              <button
                className="payButton"
                data-testid="complete-payment"
                type="button"
                onClick={() => setPaid(true)}
              >
                Pay Now
              </button>
            ) : (
              <button
                className="payButton"
                id="pay-now"
                type="button"
                onClick={() => setPaid(true)}
              >
                Pay Now
              </button>
            )}
          </section>
        </aside>
      </section>
    </main>
  );
}
