import { PerilSpec, Regime } from "./types";

/**
 * Approximate annualized exceedance probability P(I >= x).
 * Placeholder using GPD tail; replace with your calibrated POT+Hawkes.
 */
export function AEP(peril: PerilSpec, regime: Regime, intensity: number): number {
  const gpd = peril.curve_params.gpd?.[regime];
  const u = peril.curve_params.pot_threshold_u?.[regime] ?? 0;
  if (!gpd) return 0;

  if (intensity <= u) {
    // Sub-threshold frequency handled by base rate; here return a tiny value
    return 0.0001;
  }
  // Survivor function for GPD exceedance beyond threshold
  const y = (intensity - u) / (gpd.beta);
  const tail = Math.pow(1 + gpd.xi * y, -1 / gpd.xi);
  // Map to annualized exceedance via a nominal rate scaler; tune with Hawkes later
  const baseRatePerYear = 6; // placeholder mean # of exceedances/year (fit later)
  return Math.min(1, baseRatePerYear * tail);
}
