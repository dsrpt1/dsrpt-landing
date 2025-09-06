export type Regime = "calm" | "volatile" | "crisis";

export type PiecewiseLinearBand = {
  from: number; to: number;
  payout_at_from: number; payout_at_to: number;
};

export type FixedBand = {
  min_intensity: number; max_intensity: number; payout: number;
};

export type BandedLinear = {
  min_intensity: number; max_intensity: number;
  payout_at_min: number; payout_at_max: number;
};

export type PayoutSpec =
  | { type: "piecewise_linear"; bands: PiecewiseLinearBand[]; cap: number; deductible_intensity?: number }
  | { type: "banded_fixed"; bands: FixedBand[]; cap: number }
  | { type: "banded_linear"; bands: BandedLinear[]; cap: number };

export type CurveParams = {
  pot_threshold_u?: Record<Regime, number>;
  gpd?: Record<Regime, { xi: number; beta: number }>;
  clustering_hawkes?: Record<Regime, { mu: number; alpha: number; beta: number }>;
  exceedance_rate_per_hour?: Record<Regime, number>;
  duration_distribution?: "lognormal" | "gamma" | "weibull";
  duration_params?: Record<Regime, Record<string, number>>;
  severity_model?: { form: "power"; params: { a: number; b: number }; cap: number };
};

export type PricingSpec = {
  tvar_alpha: number;         // e.g., 0.99
  k_risk_load: number;        // risk loading multiplier
  overhead: number;           // O/H %
  utilization_limits: { target: number; hard: number };
  liquidity_load: { base_bps: number; slope_bps_per_util: number };
};

export type PerilSpec = {
  id: string;
  display_name: string;
  regimes: Regime[];
  measurement: Record<string, any>;
  trigger: {
    lookback_sec: number;
    confirm_sec: number;
    min_intensity: number;
    disqualifiers?: string[];
  };
  payout: PayoutSpec;
  curve_params: CurveParams;
  pricing: PricingSpec;
};

export type PortfolioState = {
  utilization: number;        // 0..1
  tvar99_headroom_usd: number;
};

export type QuoteInput = {
  perilId: string;
  regime: Regime;
  notionalUSD: number;
  attachmentPct: number;      // 0..1 of limit (parametric deductible on payout)
  limitUSD: number;
  tenorDays: number;
  portfolio: PortfolioState;
  curve: PerilSpec;
};

export type QuoteBreakdown = {
  EL: number; RL: number; CL: number; LL: number;
  O_H: number; premium: number;
  utilization_after?: number;
};
