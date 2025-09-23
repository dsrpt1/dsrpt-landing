export const POLICY_NFT_ADDRESS =
  process.env.NEXT_PUBLIC_POLICY_NFT_ADDRESS || ""; // fill later

export const POLICY_NFT_ABI = [] as const;

export function hasContract() {
  return Boolean(POLICY_NFT_ADDRESS);
}
