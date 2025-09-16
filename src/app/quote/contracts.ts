export const POLICY_NFT_ADDRESS = process.env.NEXT_PUBLIC_POLICY_NFT_ADDRESS as `0x${string}`;

export const POLICY_NFT_ABI = [
  // Minimal example; replace with your real ABI
  {
    "type":"function",
    "name":"mintPolicy",
    "stateMutability":"payable",
    "inputs":[
      {"name":"insured","type":"address"},
      {"name":"perilId","type":"string"},
      {"name":"limitUSD","type":"uint256"},
      {"name":"attachmentPct","type":"uint256"}, // 1e18 fixed-point (e.g., 0.1 * 1e18)
      {"name":"tenorDays","type":"uint256"},
      {"name":"premiumWei","type":"uint256"},
      {"name":"metadataURI","type":"string"}
    ],
    "outputs":[{"name":"tokenId","type":"uint256"}]
  }
] as const;
