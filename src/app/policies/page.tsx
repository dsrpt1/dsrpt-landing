"use client";
import { useAccount, useReadContract } from "wagmi";
import Link from "next/link";
import { POLICY_NFT_ADDRESS, POLICY_NFT_ABI } from "@/lib/contracts";

export default function Policies() {
  const { address } = useAccount();
  // Example view functions — adapt to your actual ABI
  const { data: balance } = useReadContract({
    abi: POLICY_NFT_ABI as any,
    address: POLICY_NFT_ADDRESS,
    functionName: "balanceOf",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!address }
  });

  // You’ll likely have to enumerate tokenIds by index (ERC-721 Enumerable),
  // or expose a view in your contract like `tokensOfOwner(address) -> uint256[]`.
  // For now, just link to a placeholder:
  return (
    <main style={{maxWidth:800, margin:"24px auto"}}>
      <h1>Your Policies</h1>
      {!address && <p>Connect wallet to view policies.</p>}
      {address && <p>Balance: {balance?.toString?.() ?? "0"}</p>}
      <p style={{marginTop:12}}><Link href="/quote">Get another quote →</Link></p>
    </main>
  );
}
