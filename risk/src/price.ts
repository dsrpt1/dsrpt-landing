import { QuoteInput, QuoteBreakdown } from "./types";
import { payoutFraction } from "./payout";
import { AEP } from "./ep";

/**
 * Compute EL via numeric integration over an intensity grid (quick + stable).
 * Replace AEP() and severity with your calibrated models when available.
 */
export function pricePolicy(q: QuoteInput): QuoteBreakdown {
  const { curve, regime, limitUSD, attachmentPct, portfolio } = q;
  const grid: number[] = [];
  const N = 128;
  const iMax = curve.payout.cap > 0 ? 0.30 : 0.10; // intensity cap guess (30% depeg, etc.)
  for (let k = 0; k <= N; k++) grid.push((iMax * k) / N);

  // payout after attachment (parametric deductible applies to payout fraction, not intensity)
  const EL = integrate(grid, (i) => {
    const gross = payoutFraction(i, curve.payout);
    const netPayoutFrac = Math.max(0, gross - attachmentPct);
    const ep = AEP(curve, regime, i); // annualized exceedance approx at intensity i
    const density = finiteDiffTail(ep, i, iMax, N); // simple tail-to-density proxy
    return netPayoutFrac * limitUSD * Math.max(0, density);
  });

  // Risk Loads
  const tvAr = EL * 4.5; // placeholder multiplicative gap to TVaR_99; tune from portfolio sim
  const RL = q.curve.pricing.k_risk_load * (tvAr - EL);

  // Capital Load: charge marginal TVaR if close to headroom
  const CL = Math.max(0, Math.min(tvAr, Math.max(0, tvAr - portfolio.tvar99_headroom_usd)) * 0.25);

  // Liquidity Load: base + utilization slope
  const util = portfolio.utilization;
  const LLbps = q.curve.pricing.liquidity_load.base_bps + util * q.curve.pricing.liquidity_load.slope_bps_per_util;
  const LL = (LLbps / 10000) * limitUSD;

  const OH = q.curve.pricing.overhead * (EL + RL + CL + LL);

  const premium = (EL + RL + CL + LL + OH);

  return { EL, RL, CL, LL, O_H: OH, premium, utilization_after: Math.min(0.999, util + premium / (limitUSD || 1e9)) };
}

function integrate(xs: number[], f: (x: number) => number): number {
  let acc = 0;
  for (let i = 1; i < xs.length; i++) {
    const a = xs[i - 1], b = xs[i];
    acc += 0.5 * (f(a) + f(b)) * (b - a);
  }
  return acc;
}

function finiteDiffTail(epAtI: number, i: number, iMax: number, N: number): number {
  // crude density proxy: derivative of tail using a small step
  const h = iMax / (N * 2);
  const epRight = Math.max(0, epAtI - h > 0 ? epAtI : 0);
  return Math.max(0, (epAtI - epRight) / (h || 1e-9));
}
