"use client";

import { useMemo, useState } from "react";

type Regime = "calm" | "volatile" | "crisis";

const PERILS = [
  { id: "stablecoin_depeg:USDC", label: "USDC Depeg" },
  { id: "oracle_failure:ETHUSD_chainlink", label: "Oracle Failure (ETH/USD)" },
  { id: "chain_halt:ethereum_finality", label: "Chain Halt (Ethereum)" }
];

export default function QuotePage() {
  const [perilId, setPerilId] = useState(PERILS[0].id);
  const [regime, setRegime] = useState<Regime>("volatile");
  const [limitUSD, setLimitUSD] = useState(1_000_000);
  const [attachmentPct, setAttachmentPct] = useState(0);
  const [tenorDays, setTenorDays] = useState(30);
  const [utilization, setUtilization] = useState(0.42);
  const [headroom, setHeadroom] = useState(5_000_000);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const premiumFmt = useMemo(() => {
    if (!result?.breakdown?.premium) return "-";
    return result.breakdown.premium.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  }, [result]);

  async function fetchQuote() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          perilId, regime,
          limitUSD: Number(limitUSD),
          attachmentPct: Number(attachmentPct),
          tenorDays: Number(tenorDays),
          utilization: Number(utilization),
          tvar99_headroom_usd: Number(headroom),
        })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "quote_error");
      setResult(json);
    } catch (e: any) {
      setError(e?.message ?? "quote_error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full px-6 py-8 bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Dsrpt Hazard Curve Quote</h1>
        <p className="text-neutral-400 mt-1">Live premium from calibrated peril curves</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="col-span-1 md:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Peril">
                <select className="w-full bg-neutral-900 rounded-xl px-3 py-2"
                        value={perilId} onChange={(e) => setPerilId(e.target.value)}>
                  {PERILS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </Field>

              <Field label="Regime">
                <select className="w-full bg-neutral-900 rounded-xl px-3 py-2"
                        value={regime} onChange={(e) => setRegime(e.target.value as Regime)}>
                  <option value="calm">calm</option>
                  <option value="volatile">volatile</option>
                  <option value="crisis">crisis</option>
                </select>
              </Field>

              <NumberField label="Limit (USD)" value={limitUSD} setValue={setLimitUSD} step={10000} />
              <NumberField label="Attachment (payout deductible % of limit)" value={attachmentPct} setValue={setAttachmentPct} min={0} max={1} step={0.01} />
              <NumberField label="Tenor (days)" value={tenorDays} setValue={setTenorDays} min={1} step={1} />
              <NumberField label="Portfolio Utilization (0–1)" value={utilization} setValue={setUtilization} min={0} max={1} step={0.01} />
              <NumberField label="TVaR₉₉ Headroom (USD)" value={headroom} setValue={setHeadroom} step={10000} />
            </div>

            <button
              onClick={fetchQuote}
              disabled={loading}
              className="mt-5 inline-flex items-center rounded-2xl bg-white/10 hover:bg-white/20 transition px-4 py-2"
            >
              {loading ? "Pricing..." : "Get Quote"}
            </button>

            {error && <p className="mt-3 text-red-400">{error}</p>}
          </div>

          <div className="col-span-1">
            <div className="rounded-2xl border border-white/10 bg-neutral-900 p-4">
              <h3 className="text-lg font-medium">Premium</h3>
              <div className="mt-2 text-3xl font-semibold">{premiumFmt}</div>
              {result?.breakdown && (
                <div className="mt-4 space-y-1 text-sm text-neutral-300">
                  <KV label="Expected Loss" v={result.breakdown.EL} />
                  <KV label="Risk Load" v={result.breakdown.RL} />
                  <KV label="Capital Load" v={result.breakdown.CL} />
                  <KV label="Liquidity Load" v={result.breakdown.LL} />
                  <KV label="Overhead" v={result.breakdown.O_H} />
                  <div className="mt-3 text-neutral-400 text-xs">
                    Utilization after bind (approx): {(result.breakdown.utilization_after ?? 0).toFixed(2)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-neutral-900 p-4">
          <h3 className="text-lg font-medium">Debug Payload</h3>
          <pre className="mt-2 text-xs overflow-auto">{JSON.stringify(result ?? {}, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm text-neutral-400">{label}</span>
      {children}
    </label>
  );
}

function NumberField({
  label, value, setValue, step = 1, min, max
}: { label: string; value: number; setValue: (n: number) => void; step?: number; min?: number; max?: number; }) {
  return (
    <Field label={label}>
      <input
        type="number"
        className="w-full bg-neutral-900 rounded-xl px-3 py-2"
        value={value}
        step={step}
        min={min as number | undefined}
        max={max as number | undefined}
        onChange={(e) => setValue(Number(e.target.value))}
      />
    </Field>
  );
}

function KV({ label, v }: { label: string; v: number }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span>{v?.toLocaleString?.(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }) ?? "-"}</span>
    </div>
  );
}
