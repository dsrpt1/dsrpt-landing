import { PayoutSpec } from "./types";

/** Deterministic payout fraction (0..1) given intensity and payout spec */
export function payoutFraction(intensity: number, spec: PayoutSpec): number {
  if (intensity <= 0) return 0;

  if (spec.type === "piecewise_linear") {
    let y = 0;
    for (const b of spec.bands) {
      if (intensity < b.from) continue;
      const clamped = Math.min(intensity, b.to);
      const w = (clamped - b.from) / (b.to - b.from);
      const y_from = b.payout_at_from, y_to = b.payout_at_to;
      const y_here = y_from + (y_to - y_from) * Math.max(0, Math.min(1, w));
      y = Math.max(y, y_here);
      if (intensity <= b.to) break;
    }
    return Math.min(spec.cap, Math.max(0, y));
  }

  if (spec.type === "banded_fixed") {
    for (const b of spec.bands) {
      if (intensity >= b.min_intensity && intensity < b.max_intensity) {
        return Math.min(spec.cap, Math.max(0, b.payout));
      }
    }
    return intensity >= spec.bands[spec.bands.length - 1].max_intensity ? spec.cap : 0;
  }

  if (spec.type === "banded_linear") {
    for (const b of spec.bands) {
      if (intensity >= b.min_intensity && intensity <= b.max_intensity) {
        const t = (intensity - b.min_intensity) / (b.max_intensity - b.min_intensity);
        return Math.min(spec.cap, Math.max(0, b.payout_at_min + t * (b.payout_at_max - b.payout_at_min)));
      }
    }
    return intensity > spec.bands[spec.bands.length - 1].max_intensity ? spec.cap : 0;
  }

  return 0;
}
