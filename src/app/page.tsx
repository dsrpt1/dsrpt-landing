import Link from "next/link";

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="px-3 py-1 rounded-full bg-white/5 text-xs text-dsrpt-mute">{children}</span>;
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-dsrpt-card p-4 shadow-soft">
      <div className="text-2xl font-semibold">{v}</div>
      <div className="mt-1 text-sm text-dsrpt-mute">{k}</div>
    </div>
  );
}

export default function Home() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="flex-1">
              <div className="flex gap-2 mb-4">
                <Pill>Parametric</Pill>
                <Pill>Onchain</Pill>
                <Pill>Hazard Curves</Pill>
              </div>
              <h1 className="text-4xl md:text-6xl font-semibold leading-tight">
                Price & mint parametric risk policies, live from market-calibrated hazard curves.
              </h1>
              <p className="mt-4 text-lg text-dsrpt-mute">
                Transparent triggers. Instant settlement. Risk-adjusted premiums informed by clustering,
                POT/GPD tails, and portfolio utilization.
              </p>
              <div className="mt-6 flex gap-3">
                <Link
                  href="/quote"
                  className="px-5 py-3 rounded-xl bg-dsrpt-brand hover:opacity-90 font-medium"
                >
                  Get a Quote
                </Link>
                <a
                  href="https://risk.dsrpt.finance/quote"
                  className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 font-medium"
                >
                  Launch Risk App
                </a>
              </div>
              <div className="mt-6 text-sm text-dsrpt-mute">
                Backed by curve-calibrated regimes (calm/volatile/crisis) and tail-aware liquidity loads.
              </div>
            </div>
            <div className="flex-1 w-full">
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6">
                {/* lightweight “product card” */}
                <div className="rounded-xl bg-dsrpt-card p-5 border border-white/10">
                  <div className="text-sm text-dsrpt-mute">Quote Preview</div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-white/5 p-3">
                      <div className="text-dsrpt-mute">Peril</div>
                      <div className="font-medium mt-1">USDC Depeg</div>
                    </div>
                    <div className="rounded-lg bg-white/5 p-3">
                      <div className="text-dsrpt-mute">Regime</div>
                      <div className="font-medium mt-1">Crisis</div>
                    </div>
                    <div className="rounded-lg bg-white/5 p-3">
                      <div className="text-dsrpt-mute">Limit</div>
                      <div className="font-medium mt-1">$1,000,000</div>
                    </div>
                    <div className="rounded-lg bg-white/5 p-3">
                      <div className="text-dsrpt-mute">Premium</div>
                      <div className="font-medium mt-1">$54,057</div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Link href="/quote" className="underline text-sm">Reproduce this quote →</Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Trust / stats */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat k="Perils" v="3+" />
            <Stat k="Time to Quote" v="< 1s" />
            <Stat k="Tenor" v="7–90d" />
            <Stat k="Settlement" v="Instant" />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        <h2 className="text-2xl md:text-3xl font-semibold">Why DSRPT</h2>
        <div className="mt-6 grid md:grid-cols-3 gap-4">
          {[
            {
              t: "Calibrated Hazard Curves",
              p: "POT/GPD severity with Hawkes clustering by regime. No hand-wavy pricing.",
            },
            {
              t: "Portfolio-Aware Premiums",
              p: "Utilization-driven liquidity loads and TVaR headroom baked into the quote.",
            },
            {
              t: "Parametric & Onchain",
              p: "Objective triggers, transparent bands, instant mint & settlement.",
            },
          ].map((f) => (
            <div key={f.t} className="rounded-xl border border-white/10 bg-dsrpt-card p-5">
              <div className="font-medium">{f.t}</div>
              <div className="mt-2 text-sm text-dsrpt-mute">{f.p}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="rounded-2xl bg-gradient-to-r from-dsrpt-brand/20 to-dsrpt-brand2/20 border border-white/10 p-8 md:p-10">
          <div className="md:flex items-center justify-between gap-6">
            <div>
              <h3 className="text-2xl font-semibold">Get a live quote in seconds</h3>
              <p className="text-dsrpt-mute mt-2">Then mint your policy onchain.</p>
            </div>
            <div className="mt-4 md:mt-0 flex gap-3">
              <Link href="/quote" className="px-5 py-3 rounded-xl bg-dsrpt-brand hover:opacity-90 font-medium">
                Quote Now
              </Link>
              <a href="https://risk.dsrpt.finance/quote" className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 font-medium">
                Advanced
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
