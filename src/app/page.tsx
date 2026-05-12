import { getRuntimeReadiness } from "@/lib/env";

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
    </main>
  );
}
