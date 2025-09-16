"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { parseEther } from "viem";
import { useAccount, useWriteContract } from "wagmi";
import { POLICY_NFT_ADDRESS, POLICY_NFT_ABI } from "@/lib/contracts";

export default function MintPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const payload = sp.get("payload");
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();

  if (!payload) return <main style={{padding:24}}>No quote payload. <a href="/quote">Back to Quote</a></main>;

  const data = JSON.parse(payload);
  const q = data?.input;
  const br = data?.breakdown;
  const premiumUSD = br?.premium ?? 0;

  // TODO: replace this with your FX/rate or onchain oracle; for now assume 1 ETH = $3,000 as a placeholder
  const ETH_USD = Number(process.env.NEXT_PUBLIC_ETH_USD || 3000);
  const premiumWei = parseEther((premiumUSD / ETH_USD).toFixed(6)); // rough conversion

  async function mint() {
    if (!address) return alert("Connect wallet first");
    // TODO: upload metadata to IPFS; placeholder:
    const metadataURI = `ipfs://placeholder/${q.perilId}-${Date.now()}`;

    const tokenId = await writeContractAsync({
      abi: POLICY_NFT_ABI,
      address: POLICY_NFT_ADDRESS,
      functionName: "mintPolicy",
      args: [
        address,
        q.perilId,
        BigInt(q.limitUSD),
        BigInt(Math.round((q.attachmentPct ?? 0) * 1e18)),
        BigInt(q.tenorDays),
        premiumWei,
        metadataURI
      ],
      value: premiumWei, // pay premium
    });

    router.push(`/policy/${tokenId.toString()}`);
  }

  return (
    <main style={{maxWidth:800, margin:"24px auto", padding:"0 16px"}}>
      <h1>Mint Policy</h1>
      <div style={{marginTop:12, padding:12, border:'1px solid #eee', borderRadius:12}}>
        <div>Peril: <b>{q?.perilId}</b></div>
        <div>Limit: <b>${q?.limitUSD?.toLocaleString()}</b></div>
        <div>Attachment: <b>{((q?.attachmentPct ?? 0)*100).toFixed(2)}%</b></div>
        <div>Tenor: <b>{q?.tenorDays} days</b></div>
        <div>Premium (USD): <b>${Math.round(premiumUSD).toLocaleString()}</b></div>
        <div>Premium (ETH est.): <b>{(Number(premiumWei)/1e18).toFixed(6)}</b></div>
        <button onClick={mint} disabled={isPending} style={{marginTop:12}}>
          {isPending ? "Minting..." : "Confirm & Mint"}
        </button>
      </div>
    </main>
  );
}
