import { getRuntimeReadiness } from "@/lib/env";
import { SHOPFLOW_SCENARIOS } from "@/demo/shopflow";

export default function Home() {
  const readiness = getRuntimeReadiness();

  return (
    <main className="shell">
      <section className="intro">
        <p className="eyebrow">SpecHeal</p>
        <h1>Recovery cockpit foundation is ready.</h1>
        <p>
          The first slice establishes the app runtime, typed environment contract,
          and persistence schema. ShopFlow scenarios come next.
        </p>
      </section>

      <section className="readiness" aria-label="Runtime readiness">
        {readiness.map((item) => (
          <div className="readinessItem" key={item.name}>
            <span className={item.ready ? "dot ready" : "dot missing"} />
            <div>
              <strong>{item.name}</strong>
              <p>{item.message}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="scenarioLinks" aria-label="ShopFlow scenario links">
        <h2>ShopFlow target states</h2>
        <div>
          {SHOPFLOW_SCENARIOS.map((scenario) => (
            <a
              href={`/shopflow?state=${scenario.runtimeState}`}
              key={scenario.id}
            >
              <span>{scenario.title}</span>
              <strong>{scenario.label}</strong>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
