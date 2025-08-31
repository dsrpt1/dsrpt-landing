import React, { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";

/**
 * DSRPT — Parametric Depeg Cover (V2) · One‑page Futuristic UI
 * - Connect wallet
 * - Configure contract addresses (token/oracle/cover)
 * - Read live state (rates, pool, your policy)
 * - Owner ops: approve + fund pool, pause, set params (subset shown)
 * - User ops: choose coverage (linear pricing), approve premium, buy
 * - Oracle ops: set mock price (for demo), trigger payout
 *
 * Assumptions
 * - Token has 6 decimals (USDC-style)
 * - Oracle price uses 8 decimals (e.g., $0.96 → 96000000)
 * - Contracts are already deployed on Sepolia
 */

// === Constants ===
const TOKEN_DECIMALS = 6n; // MockUSD
const FEED_DECIMALS = 8n;  // MockOracle default

// === Minimal ABIs ===
const erc20Abi = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
  "function transfer(address,uint256) returns (bool)",
  "function transferFrom(address,address,uint256) returns (bool)",
  "function mint(address,uint256)"
];

const oracleAbi = [
  "function setPrice(int256)",
  "function decimals() view returns (uint8)",
  "function latestRoundData() view returns (uint80,int256,uint256,uint256,uint80)"
];

const coverAbi = [
  "function payoutToken() view returns (address)",
  "function fixedPremium() view returns (uint256)",
  "function fixedPayout() view returns (uint256)",
  "function poolCap() view returns (uint256)",
  "function minPolicySecs() view returns (uint256)",
  "function maxPolicySecs() view returns (uint256)",
  "function heartbeatSecs() view returns (uint256)",
  "function paused() view returns (bool)",
  "function policies(address) view returns (uint256 premium, uint256 payout, uint64 purchasedAt, uint64 expiresAt, bool paid, bool active)",
  "function fundPool(uint256)",
  "function setPaused(bool)",
  "function setParams(uint256,uint256,uint256,uint256,uint256,uint256)",
  "function setMaxPolicyPayout(uint256)",
  "function buyPolicy(uint64)",
  "function buyPolicyForCoverage(uint64,uint256)",
];

// === Default (Sepolia) — replace if needed ===
const DEFAULTS = {
  token: "0x112B36dB8d5e0Ab86174E71737d64A51591A6868",
  oracle: "0x67dC9b9B24f89930D13fB72b28EE898369D5349B",
  cover:  "0x34f6bCE92A6E1c142B7089Ae66Be62CFdc9A3e8B",
};

// === Helpers ===
function useInjected() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [address, setAddress] = useState<string>("");
  const [chainId, setChainId] = useState<number | null>(null);
  const [networkName, setNetworkName] = useState<string>("");

  const refreshFromEth = async () => {
    const eth = (window as any).ethereum;
    if (!eth) return;
    const prov = new ethers.BrowserProvider(eth);
    const s = await prov.getSigner();
    const a = await s.getAddress();
    const n = await prov.getNetwork();
    setProvider(prov);
    setSigner(s);
    setAddress(a);
    setChainId(Number(n.chainId));
    setNetworkName(n?.name ?? (Number(n.chainId) === SEPOLIA_ID_DEC ? "sepolia" : `chain ${Number(n.chainId)}`));
  };

  const connect = async () => {
    if (!(window as any).ethereum) throw new Error("No wallet injected");
    const prov = new ethers.BrowserProvider((window as any).ethereum);
    await prov.send("eth_requestAccounts", []);
    await refreshFromEth();
  };

  const switchToSepolia = async () => {
    await ensureSepolia();
    await refreshFromEth();
  };

  useEffect(() => {
    const eth = (window as any).ethereum;
    if (!eth) return;
    const onAcc = () => refreshFromEth();
    const onChain = () => refreshFromEth();
    eth.on?.("accountsChanged", onAcc);
    eth.on?.("chainChanged", onChain);
    return () => {
      eth.removeListener?.("accountsChanged", onAcc);
      eth.removeListener?.("chainChanged", onChain);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { provider, signer, address, chainId, networkName, connect, switchToSepolia };
}


const connect = async () => {
  if (!(window as any).ethereum) throw new Error("No wallet injected");
  const prov = new ethers.BrowserProvider((window as any).ethereum);
  await prov.send("eth_requestAccounts", []);
  const s = await prov.getSigner();
  const a = await s.getAddress();
  const n = await prov.getNetwork();
  setProvider(prov);
  setSigner(s);
  setAddress(a);
  setChainId(Number(n.chainId));
  setNetworkName(n.name ?? (Number(n.chainId) === SEPOLIA_ID_DEC ? "sepolia" : `chain ${Number(n.chainId)}`));
};

const switchToSepolia = async () => {
  await ensureSepolia();
  // Refresh provider/signer state after switch
  const prov = new ethers.BrowserProvider((window as any).ethereum);
  const s = await prov.getSigner();
  const a = await s.getAddress();
  const n = await prov.getNetwork();
  setProvider(prov);
  setSigner(s);
  setAddress(a);
  setChainId(Number(n.chainId));
  setNetworkName(n.name ?? (Number(n.chainId) === SEPOLIA_ID_DEC ? "sepolia" : `chain ${Number(n.chainId)}`));
};

return { provider, signer, address, chainId, networkName, connect, switchToSepolia };


  useEffect(() => {
    const eth = (window as any).ethereum;
    if (!eth) return;
    const onAcc = async () => {
      const prov = new ethers.BrowserProvider(eth);
      const s = await prov.getSigner();
      setSigner(s); setAddress(await s.getAddress());
    };
    eth.on?.("accountsChanged", onAcc);
    eth.on?.("chainChanged", () => window.location.reload());
    return () => { eth.removeListener?.("accountsChanged", onAcc); };
  }, []);

  return { provider, signer, address, chainId, connect };
}

function fmtUnits(value?: bigint, decimals: bigint = 6n) {
  if (value === undefined || value === null) return "-";
  const neg = value < 0n; const v = neg ? -value : value;
  const base = 10n ** decimals;
  const whole = v / base; const frac = v % base;
  const fracStr = frac.toString().padStart(Number(decimals), '0').replace(/0+$/, '');
  return `${neg ? '-' : ''}${whole}${fracStr ? '.' + fracStr : ''}`;
}

function Stat({label, value}:{label:string; value:React.ReactNode}){
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
      <div className="text-xs uppercase tracking-wide opacity-60">{label}</div>
      <div className="text-lg mt-1 font-medium">{value}</div>
    </div>
  );
}

export default function DSRPTLanding() {
  const { provider, signer, address, chainId, connect } = useInjected();
const SEPOLIA_ID_DEC = 11155111;
const SEPOLIA_ID_HEX = "0xaa36a7"; // 11155111 in hex

async function ensureSepolia() {
  const eth = (window as any).ethereum;
  if (!eth) throw new Error("No wallet found");
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SEPOLIA_ID_HEX }],
    });
  } catch (err: any) {
    // 4902 = chain not added
    if (err?.code === 4902) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: SEPOLIA_ID_HEX,
          chainName: "Sepolia",
          nativeCurrency: { name: "Sepolia Ether", symbol: "SEP", decimals: 18 },
          // Use your own RPC with key so rate limits don’t bite:
          rpcUrls: [process.env.NEXT_PUBLIC_SEPOLIA_RPC ?? "https://rpc.ankr.com/eth_sepolia/<YOUR_KEY>"],
          blockExplorerUrls: ["https://sepolia.etherscan.io/"],
        }],
      });
    } else {
      throw err;
    }
  }
}

  // Addresses
  const [tokenAddr, setTokenAddr] = useState(DEFAULTS.token);
  const [oracleAddr, setOracleAddr] = useState(DEFAULTS.oracle);
  const [coverAddr, setCoverAddr]   = useState(DEFAULTS.cover);

  // Reads
  const [tokenSymbol, setTokenSymbol] = useState("mUSD");
  const [fixedPremium, setFixedPremium] = useState<bigint>(5_000_000n);
  const [fixedPayout, setFixedPayout]   = useState<bigint>(100_000_000n);
  const [poolCap, setPoolCap] = useState<bigint>(0n);
  const [poolBal, setPoolBal] = useState<bigint>(0n);
  const [paused, setPaused] = useState(false);
  const [heartbeat, setHeartbeat] = useState<bigint>(5400n);
  const [policy, setPolicy] = useState<any>(null);
  const [oraclePrice, setOraclePrice] = useState<bigint>(100_000_000n);

  // Inputs
  const [fundAmount, setFundAmount] = useState("20000"); // mUSD (human)
  const [desiredPayout, setDesiredPayout] = useState("1000"); // mUSD
  const [durationDays, setDurationDays] = useState(7);
  const [depegDisplay, setDepegDisplay] = useState("0.96");

  // Contracts
  const token = useMemo(() => (provider ? new ethers.Contract(tokenAddr, erc20Abi, signer ?? provider) : null), [provider, signer, tokenAddr]);
  const cover = useMemo(() => (provider ? new ethers.Contract(coverAddr, coverAbi, signer ?? provider) : null), [provider, signer, coverAddr]);
  const oracle = useMemo(() => (provider ? new ethers.Contract(oracleAddr, oracleAbi, signer ?? provider) : null), [provider, signer, oracleAddr]);

  // Derived premium (linear pricing)
  const computedPremium = useMemo(() => {
    try {
      const payout = ethers.parseUnits(desiredPayout || "0", Number(TOKEN_DECIMALS));
      if (fixedPayout === 0n) return 0n;
      return (fixedPremium * payout) / fixedPayout;
    } catch { return 0n; }
  }, [desiredPayout, fixedPremium, fixedPayout]);

  const load = async () => {
    try {
      if (!provider) return;
      const c = new ethers.Contract(coverAddr, coverAbi, provider);
      const t = new ethers.Contract(tokenAddr, erc20Abi, provider);
      const o = new ethers.Contract(oracleAddr, oracleAbi, provider);
      const [sym, fprem, fpayout, pc, pausedNow, hb, pol, poolTokenBal, round] = await Promise.all([
        t.symbol(), c.fixedPremium(), c.fixedPayout(), c.poolCap(), c.paused(), c.heartbeatSecs(), address ? c.policies(address) : Promise.resolve(null), t.balanceOf(coverAddr), o.latestRoundData()
      ]);
      setTokenSymbol(sym); setFixedPremium(fprem); setFixedPayout(fpayout); setPoolCap(pc); setPaused(pausedNow); setHeartbeat(hb); setPolicy(pol); setPoolBal(poolTokenBal);
      if (round && Array.isArray(round)) setOraclePrice(round[1]);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [provider, address, tokenAddr, coverAddr, oracleAddr]);

  // Actions
  const doApproveFunding = async () => {
    if (!token) return; const amt = ethers.parseUnits(fundAmount || "0", Number(TOKEN_DECIMALS));
    const tx = await token.approve(coverAddr, amt); await tx.wait(); await load();
  };
  const doFundPool = async () => {
    if (!cover) return; const amt = ethers.parseUnits(fundAmount || "0", Number(TOKEN_DECIMALS));
    const tx = await cover.fundPool(amt); await tx.wait(); await load();
  };
  const doApprovePremium = async () => {
    if (!token) return; const tx = await token.approve(coverAddr, computedPremium);
    await tx.wait(); await load();
  };
  const doBuyPolicy = async () => {
    if (!cover) return; const secs = BigInt(Math.round(durationDays * 24 * 60 * 60));
    const payout = ethers.parseUnits(desiredPayout || "0", Number(TOKEN_DECIMALS));
    const tx = await cover.buyPolicyForCoverage(secs, payout); await tx.wait(); await load();
  };
  const doSetOracle = async () => {
    if (!oracle) return; const [w, f = ""] = depegDisplay.split(".");
    const norm = w + (f + "0".repeat(Number(FEED_DECIMALS))).slice(0, Number(FEED_DECIMALS));
    const px = BigInt(norm); const tx = await oracle.setPrice(px); await tx.wait(); await load();
  };
  const doTrigger = async () => { if (!cover || !address) return; const tx = await cover.triggerAndPayout(address); await tx.wait(); await load(); };

  // UI building blocks
  const Card = ({title, children}:{title:string; children:any}) => (
    <div className="rounded-2xl p-6 bg-white/5 border border-white/10 shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">{title}</h3>
      </div>
      {children}
    </div>
  );

  const PrimaryBtn = (props:any) => (
    <button {...props} className={(props.className??"") + " rounded-xl px-4 py-2 bg-cyan-400/90 text-black font-medium hover:bg-cyan-300 transition disabled:opacity-50 disabled:cursor-not-allowed"} />
  );
  const GhostBtn = (props:any) => (
    <button {...props} className={(props.className??"") + " rounded-xl px-4 py-2 bg-white/10 hover:bg-white/20 transition disabled:opacity-50 disabled:cursor-not-allowed"} />
  );
  const Input = (props:any) => (
    <input {...props} className={(props.className??"") + " w-full rounded-xl bg-white/10 px-3 py-2 outline-none focus:ring-2 ring-cyan-400"} />
  );
  const Label = ({children}:{children:any}) => (
    <label className="block text-sm opacity-70 mb-1">{children}</label>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Gradient aura */}
      <div className="fixed inset-0 -z-10 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.18),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(167,139,250,0.18),transparent_45%),radial-gradient(circle_at_40%_80%,rgba(74,222,128,0.15),transparent_40%)]" />

      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          <span className="text-cyan-300">DSRPT</span>
          <span className="opacity-70"> · Parametric Depeg Cover</span>
        </h1>
        <GhostBtn onClick={connect}>
  {address
    ? `${address.slice(0, 6)}…${address.slice(-4)} · ${networkName || (chainId ?? "—")}`
    : "Connect Wallet"}
</GhostBtn>


      </header>
{chainId !== null && chainId !== SEPOLIA_ID_DEC && (
  <div className="max-w-6xl mx-auto px-6 mt-3">
    <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-medium">Wrong network detected</div>
          <div className="opacity-80">
            Connected to <span className="font-mono">{networkName || `chain ${chainId}`}</span>. Please switch to{" "}
            <b>Sepolia (11155111)</b>.
          </div>
        </div>
        <button
          onClick={switchToSepolia}
          className="rounded-lg px-3 py-2 bg-cyan-400/90 text-black font-medium hover:bg-cyan-300"
        >
          Switch to Sepolia
        </button>
      </div>
    </div>
  </div>
)}


      <main className="max-w-6xl mx-auto px-6 pb-24">
        {/* Top Stats */}
        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="Network" value={chainId ? `Chain ${chainId}` : "—"} />
          <Stat label="Fixed Premium" value={`${fmtUnits(fixedPremium, TOKEN_DECIMALS)} ${tokenSymbol}`} />
          <Stat label="Fixed Payout" value={`${fmtUnits(fixedPayout, TOKEN_DECIMALS)} ${tokenSymbol}`} />
          <Stat label="Pool Balance" value={`${fmtUnits(poolBal, TOKEN_DECIMALS)} ${tokenSymbol}`} />
        </section>

        {/* Address Config */}
        <section className="mt-8 grid md:grid-cols-3 gap-6">
          <Card title="Addresses">
            <div className="space-y-3">
              <div>
                <Label>Token</Label>
                <Input value={tokenAddr} onChange={e=>setTokenAddr(e.target.value)} />
              </div>
              <div>
                <Label>Oracle</Label>
                <Input value={oracleAddr} onChange={e=>setOracleAddr(e.target.value)} />
              </div>
              <div>
                <Label>Cover</Label>
                <Input value={coverAddr} onChange={e=>setCoverAddr(e.target.value)} />
              </div>
              <PrimaryBtn onClick={load}>Refresh State</PrimaryBtn>
            </div>
          </Card>

          {/* Coverage Builder */}
          <Card title="Coverage Builder (Linear Pricing)">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Desired Payout ({tokenSymbol})</Label>
                <Input value={desiredPayout} onChange={e=>setDesiredPayout(e.target.value)} placeholder="1000" />
              </div>
              <div>
                <Label>Duration (days)</Label>
                <Input type="number" min={1} value={durationDays} onChange={e=>setDurationDays(parseInt(e.target.value||"0")||0)} />
              </div>
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm opacity-80">Premium → <span className="font-medium text-cyan-300">{fmtUnits(computedPremium, TOKEN_DECIMALS)} {tokenSymbol}</span></div>
              <div className="space-x-2">
                <GhostBtn onClick={doApprovePremium} disabled={!address}>Approve</GhostBtn>
                <PrimaryBtn onClick={doBuyPolicy} disabled={!address}>Buy Policy</PrimaryBtn>
              </div>
            </div>
          </Card>

          {/* Oracle & Trigger */}
          <Card title="Oracle · Trigger">
            <div className="space-y-2">
              <div className="text-sm opacity-70">Current Oracle Price: <span className="opacity-100">{fmtUnits(oraclePrice, FEED_DECIMALS)} USD</span></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Set Price (e.g., 0.96)</Label>
                  <Input value={depegDisplay} onChange={e=>setDepegDisplay(e.target.value)} />
                </div>
                <div>
                  <Label>Heartbeat (s)</Label>
                  <Input disabled value={heartbeat.toString()} />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <GhostBtn onClick={doSetOracle} disabled={!address}>Set Oracle</GhostBtn>
                <PrimaryBtn onClick={doTrigger} disabled={!address}>Trigger Payout</PrimaryBtn>
              </div>
            </div>
          </Card>
        </section>

        {/* Owner / Pool Ops + Policy View */}
        <section className="mt-8 grid md:grid-cols-3 gap-6">
          <Card title="Owner · Pool Funding">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fund Amount ({tokenSymbol})</Label>
                <Input value={fundAmount} onChange={e=>setFundAmount(e.target.value)} />
              </div>
              <div>
                <Label>Pool Cap</Label>
                <Input disabled value={fmtUnits(poolCap, TOKEN_DECIMALS)} />
              </div>
            </div>
            <div className="flex items-center justify-between mt-4">
              <GhostBtn onClick={doApproveFunding} disabled={!address}>Approve</GhostBtn>
              <PrimaryBtn onClick={doFundPool} disabled={!address}>Fund Pool</PrimaryBtn>
            </div>
          </Card>

          <Card title="Your Policy">
            <div className="space-y-2 text-sm">
              {policy ? (
                <>
                  <div>Premium: <span className="font-medium">{fmtUnits(policy[0] ?? 0n, TOKEN_DECIMALS)} {tokenSymbol}</span></div>
                  <div>Payout: <span className="font-medium">{fmtUnits(policy[1] ?? 0n, TOKEN_DECIMALS)} {tokenSymbol}</span></div>
                  <div>Expires: <span className="font-medium">{policy[3] ? new Date(Number(policy[3])*1000).toLocaleString() : "—"}</span></div>
                  <div>Status: <span className="font-medium">{policy[5] ? (policy[4] ? "Paid" : "Active") : "None"}</span></div>
                </>
              ) : (
                <div className="opacity-70">Connect and buy a policy to see details.</div>
              )}
            </div>
          </Card>

          <Card title="Theme & Diagnostics">
            <div className="text-sm space-y-2 opacity-80">
              <div>Connected: {address ? `${address.slice(0,6)}…${address.slice(-4)}` : "—"}</div>
              <div>Cover Token Balance: {fmtUnits(poolBal, TOKEN_DECIMALS)} {tokenSymbol}</div>
              <div>Paused: {paused ? "Yes" : "No"}</div>
            </div>
            <div className="mt-4 text-xs opacity-60">
              <div>Tip: For demos, mint yourself tokens via your token contract if low.</div>
              <div>Pricing: premium = fixedPremium × desiredPayout / fixedPayout</div>
            </div>
          </Card>
        </section>
      </main>

      <footer className="max-w-6xl mx-auto px-6 py-8 text-center opacity-60 text-sm">
        © {new Date().getFullYear()} DSRPT · Parametric Risk · Demo UI
      </footer>
    </div>
  );
}
