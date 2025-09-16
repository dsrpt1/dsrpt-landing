"use client";

import { useState } from "react";

type Regime = "calm" | "volatile" | "crisis";
const PERILS = [
  { id: "stablecoin_depeg:USDC", label: "USDC Depeg" },
  { id: "oracle_failure:ETHUSD_chainlink", label: "Oracle Failure (ETH/USD)" },
  { id: "chain_halt:ethereum_finality", label: "Chain Halt (Ethereum)" },
];

export default function QuotePage() {
  const [perilId, setPerilId] = useState(PERILS[0].id);
  const [regime, setRegime] = useState<Regime>("volatile");
  const [limitUSD, setLimitUSD] = useState(1_000_000);
  const [attachmentPct, setAttachmentPct] = useState(0);
  const [tenorDays, setTenorDays] = useState(30);
  const [utilization, setUtilization] = useState(0.35);
  const [headroom, setHeadroom] = useState(5_000_000);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchQuote() {
    setLoading(true); setError(null); setResult(null);
    try {
      const url = process.env.NEXT_PUBLIC_RISK_API_BASE || "https://risk.dsrpt.finance";
      const res = await fetch(`${url}/api/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ perilId, regime, limitUSD, attachmentPct, tenorDays, utilization, tvar99_headroom_usd: headroom })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "quote_error");
      setResult(json);
    } catch (e: any) { setError(e.message ?? "quote_error"); }
    finally { setLoading(false); }
  }

  return (
    <main style={{maxWidth:900, margin:"32px auto", padding:"0 16px"}}>
      <h1>Get Quote</h1>
      {/* inputs … keep your existing controls if you like */}
      <div style={{display:'grid', gap:12, gridTemplateColumns:'1fr 1fr'}}>
        <select value={perilId} onChange={e=>setPerilId(e.target.value)}>
          {PERILS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <select value={regime} onChange={e=>setRegime(e.target.value as Regime)}>
          <option value="calm">calm</option><option value="volatile">volatile</option><option value="crisis">crisis</option>
        </select>
        <input type="number" value={limitUSD} onChange={e=>setLimitUSD(Number(e.target.value))} placeholder="Limit USD" />
        <input type="number" value={attachmentPct} onChange={e=>setAttachmentPct(Number(e.target.value))} step="0.01" min="0" max="1" placeholder="Attachment %" />
        <input type="number" value={tenorDays} onChange={e=>setTenorDays(Number(e.target.value))} placeholder="Tenor days" />
        <input type="number" value={utilization} onChange={e=>setUtilization(Number(e.target.value))} step="0.01" min="0" max="1" placeholder="Portfolio Utilization" />
        <input type="number" value={headroom} onChange={e=>setHeadroom(Number(e.target.value))} placeholder="TVaR99 Headroom" />
      </div>
      <button onClick={fetchQuote} disabled={loading} style={{marginTop:12}}>
        {loading ? "Pricing..." : "Get Quote"}
      </button>

      {error && <p style={{color:'red'}}>{error}</p>}
      {result?.breakdown && (
        <div style={{marginTop:16, padding:12, border:'1px solid #eee', borderRadius:12}}>
          <div>Premium: <b>{result.breakdown.premium.toLocaleString(undefined, { style:'currency', currency:'USD', maximumFractionDigits:0 })}</b></div>
          <div style={{fontSize:12, opacity:.7, marginTop:8}}>EL: {Math.round(result.breakdown.EL)} | RL: {Math.round(result.breakdown.RL)} | LL: {Math.round(result.breakdown.LL)} | O/H: {Math.round(result.breakdown.O_H)}</div>
          <a href={`/mint?payload=${encodeURIComponent(JSON.stringify(result))}`} style={{display:'inline-block', marginTop:10}}>Continue to Mint →</a>
        </div>
      )}
    </main>
  );
}
