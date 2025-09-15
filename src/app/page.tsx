import DSRPTLanding from "@/components/DSRPTLanding";

export default function Page() {
  return <DSRPTLanding />;
  return (
    <div className="min-h-screen text-white relative">
      {/* 🔹 Futuristic grid background */}
      <div className="dsrpt-grid" />

      {/* 🔹 Hero Section */}
      <div className="max-w-7xl mx-auto px-6 pt-10 pb-4 relative z-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-cyan-400/90 shadow-[0_0_30px_#22d3ee99]" />
            <div className="font-display text-2xl">DSRPT</div>
            <span className="ml-2 text-xs px-2 py-1 rounded-lg border border-white/15 bg-white/5">
              Parametric Depeg Cover
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <a className="btn btn-ghost" href="https://docs.google.com" target="_blank">
              Docs
            </a>
            <a className="btn btn-ghost" href="https://github.com/dsrpt1/dsrpt-landing" target="_blank">
              GitHub
            </a>
            <a className="btn btn-primary" href="#app">Launch App</a>
          </div>
        </div>

        <div className="mt-10 grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl leading-tight">
              Instant, rules-based payouts{" "}
              <span className="text-cyan-300">when stables depeg</span>.
            </h1>
            <p className="mt-4 text-white/70 text-lg">
              On-chain parametric cover for USDC/USDT depegs. No adjusters. No paperwork.
              Just verifiable conditions and automatic payout.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a className="btn btn-primary" href="#app">Try the Demo</a>
              <a className="btn btn-accent" href="mailto:hello@dsrpt.finance">Contact Sales</a>
              <span className="text-white/50 text-sm flex items-center gap-2">
                <span className="kbd">Sepolia</span> <span>• demo assets/oracle</span>
              </span>
            </div>
          </div>

          <div className="glass glass-hover p-6">
            {/* Simple metrics preview */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-[11px] uppercase tracking-wide text-white/60">TVL</div>
                <div className="text-2xl font-semibold mt-1">Live</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-[11px] uppercase tracking-wide text-white/60">Premium</div>
                <div className="text-2xl font-semibold mt-1">BPS</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-[11px] uppercase tracking-wide text-white/60">Oracle</div>
                <div className="text-2xl font-semibold mt-1">Price</div>
              </div>
            </div>
            <p className="text-white/60 text-sm mt-4">
              Scroll to the app section below for full controls (fund, buy, trigger, etc.).
            </p>
          </div>
        </div>
      </div>

      {/* 🔹 App Section */}
      <div id="app" className="mt-8 relative z-10">
        <DSRPTLanding />
      </div>

      {/* 🔹 Footer */}
      <div className="max-w-7xl mx-auto px-6 py-10 text-xs text-white/50 relative z-10">
        © {new Date().getFullYear()} DSRPT. Demo on Sepolia with mock oracle.
      </div>
    </div>
  );
}
