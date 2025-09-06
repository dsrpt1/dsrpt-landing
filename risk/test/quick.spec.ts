import specs from "../specs/perils.v1.json";
import { pricePolicy } from "../src/price";
import { QuoteInput, PerilSpec } from "../src/types";

const usdc = (specs as any).perils.find((p: any) => p.id === "stablecoin_depeg:USDC") as PerilSpec;

const q: QuoteInput = {
  perilId: usdc.id,
  regime: "crisis",
  notionalUSD: 1_000_000,
  attachmentPct: 0.0,
  limitUSD: 1_000_000,
  tenorDays: 30,
  portfolio: { utilization: 0.42, tvar99_headroom_usd: 5_000_000 },
  curve: usdc
};

const res = pricePolicy(q);
console.log(res);
