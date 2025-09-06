"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";

/* -------------------------------------------------------------------------- */
/*                                  CONSTANTS                                  */
/* -------------------------------------------------------------------------- */

const DEFAULTS = {
  token: (process.env.NEXT_PUBLIC_TOKEN ??
    "0x112B36dB8d5e0Ab86174E71737d64A51591A6868") as `0x${string}`,
  oracle: (process.env.NEXT_PUBLIC_ORACLE ??
    "0x67dC9b9B24f89930D13fB72b28EE898369D5349B") as `0x${string}`,
  // ⬇️ fallback was the V1 address; change to V2:
  cover: (process.env.NEXT_PUBLIC_COVER ??
    "0x8B12F6eD2E37277F9F9BF4d48931fBe57616CA57") as `0x${string}`,
};


const SEPOLIA_ID_DEC = 11155111;
const SEPOLIA_ID_HEX = "0xaa36a7";
const PUBLIC_RPC = process.env.NEXT_PUBLIC_SEPOLIA_RPC ?? "";
const TOKEN_DECIMALS = 6n;

/* -------------------------------------------------------------------------- */
/*                                     ABIs                                   */
/* -------------------------------------------------------------------------- */

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
  "function allowance(address owner,address spender) view returns (uint256)",
  "function mint(address,uint256)",
] as const;

const ORACLE_ABI = [
  "function setPrice(int256) external",
  "function latestRoundData() view returns (uint80, int256, uint256, uint256, uint80)",
] as const;

const COVER_ABI = [
  "function fundPool(uint256) external",
  "function buyPolicy(uint64,uint256) external",
  "function triggerAndPayout(address) external",
  "function poolBalance() view returns (uint256)",
  "function premiumBps() view returns (uint16)",
  "function policies(address) view returns (uint64 expiry, uint256 payout, bool active)",
] as const;

/* -------------------------------------------------------------------------- */
/*                                   HELPERS                                  */
/* -------------------------------------------------------------------------- */

function parseUnits6(human: string): bigint | null {
  if (!human?.trim()) return 0n;
  if (!isFinite(Number(human))) return null;
  const [i, f = ""] = human.split(".");
  const frac = (f + "000000").slice(0, 6);
  return BigInt(i || "0") * 10n ** TOKEN_DECIMALS + BigInt(frac || "0");
}
function formatUnits6(raw?: bigint) {
  if (raw === undefined || raw === null) return "-";
  return ethers.formatUnits(raw, Number(TOKEN_DECIMALS));
}
function withCommas(n: string) {
  const [i, f] = n.split(".");
  return `${i.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${f ? "." + f : ""}`;
}
function short(addr?: string) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";
}

async function ensureSepolia(): Promise<void> {
  const eth = (globalThis as any).ethereum;
  if (!eth) throw new Error("No injected wallet found");
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: SEPOLIA_ID_HEX }] });
  } catch (err: any) {
    if (err?.code === 4902) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: SEPOLIA_ID_HEX,
            chainName: "Sepolia",
            nativeCurrency: { name: "Sepolia Ether", symbol: "SEP", decimals: 18 },
            rpcUrls: PUBLIC_RPC ? [PUBLIC_RPC] : ["https://rpc.sepolia.org"],
            blockExplorerUrls: ["https://sepolia.etherscan.io/"],
          },
        ],
      });
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: SEPOLIA_ID_HEX }] });
    } else {
      throw err;
    }
  }
}

/* -------------------------------- Wallet Hook ------------------------------- */

function useInjected() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [address, setAddress] = useState<string>("");
  const [chainId, setChainId] = useState<number | null>(null);
  const [networkName, setNetworkName] = useState<string>("");

  const refresh = async () => {
    const eth = (globalThis as any).ethereum;
    if (!eth) return;
    const prov = new ethers.BrowserProvider(eth);
    const s = await prov.getSigner();
    const a = await s.getAddress();
    const n = await prov.getNetwork();
    const cid = Number(n.chainId);
    setProvider(prov);
    setSigner(s);
    setAddress(a);
    setChainId(cid);
    setNetworkName(n?.name ?? (cid === SEPOLIA_ID_DEC ? "sepolia" : `chain ${cid}`));
  };

  const connect = async () => {
    const eth = (globalThis as any).ethereum;
    if (!eth) throw new Error("No wallet injected");
    const prov = new ethers.BrowserProvider(eth);
    await prov.send("eth_requestAccounts", []);
    await refresh();
  };

  const switchToSepolia = async () => {
    await ensureSepolia();
    await refresh();
  };

  useEffect(() => {
    const eth = (globalThis as any).ethereum;
    if (!eth) return;
    const onAcc = () => refresh();
    const onChain = () => refresh();
    eth.on?.("accountsChanged", onAcc);
    eth.on?.("chainChanged", onChain);
    return () => {
      eth.removeListener?.("accountsChanged", onAcc);
      eth.removeListener?.("chainChanged", onChain);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { provider, signer, address, chainId, networkName, connect, switchToSepolia, refresh };
}

/* --------------------------------- UI Prims -------------------------------- */

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" };
const Button: React.FC<BtnProps> = ({ variant = "primary", className = "", ...p }) => {
  const base =
    "px-3 py-2 rounded-xl transition font-semibold disabled:opacity-50 active:scale-[0.99] outline-none";
  const styles =
    variant === "primary"
      ? "bg-cyan-400 text-black hover:bg-cyan-300 shadow-[0_0_20px_#22d3ee55]"
      : variant === "danger"
      ? "bg-rose-500 text-white hover:bg-rose-400 shadow-[0_0_20px_#f43f5e55]"
      : "border border-white/20 hover:bg-white/10 text-white";
  return <button {...p} className={`${base} ${styles} ${className}`} />;
};

const Card: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({
  title,
  children,
  className = "",
}) => (
  <div className={`rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur p-5 ${className}`}>
    <div className="text-xs uppercase tracking-wide text-white/60 mb-2">{title}</div>
    {children}
  </div>
);

const Field: React.FC<{
  label: string;
  value: string | number;
  onChange?: (v: string) => void;
  placeholder?: string;
  right?: React.ReactNode;
  type?: string;
}> = ({ label, value, onChange, placeholder, right, type = "text" }) => (
  <label className="block mb-3">
    <div className="text-xs text-white/60 mb-1">{label}</div>
    <div className="flex items-center gap-2">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 outline-none focus:border-cyan-400"
      />
      {right}
    </div>
  </label>
);

/* -------------------------------- COMPONENT -------------------------------- */

export default function DSRPTLanding() {
  const { provider, signer, address, chainId, networkName, connect, switchToSepolia, refresh } = useInjected();

  // Addrs
  const TOKEN = DEFAULTS.token;
  const ORACLE = DEFAULTS.oracle;
  const COVER = DEFAULTS.cover;

  // State
  const [poolBalance, setPoolBalance] = useState<bigint>(0n);
  const [myBal, setMyBal] = useState<bigint>(0n);
  const [allowance, setAllowance] = useState<bigint>(0n);
  const [premiumBps, setPremiumBps] = useState<number>(5); // live from chain
  const [oraclePrice, setOraclePrice] = useState<string>("1.000000");

  const [payoutStr, setPayoutStr] = useState<string>("1000");
  const [durationSec, setDurationSec] = useState<string>("604800");
  const [fundStr, setFundStr] = useState<string>("10000");
  const [priceStr, setPriceStr] = useState<string>("0.960000");

  const [policyActive, setPolicyActive] = useState<boolean>(false);
  const [policyPayout, setPolicyPayout] = useState<bigint>(0n);
  const [policyExpiry, setPolicyExpiry] = useState<number>(0);
  const [countdown, setCountdown] = useState<string>("—");

  const [busy, setBusy] = useState<string>("");
  const [err, setErr] = useState<string>("");

  const wrongChain = chainId !== null && chainId !== SEPOLIA_ID_DEC;

  // Derived
  const payoutRaw = useMemo(() => parseUnits6(payoutStr) ?? 0n, [payoutStr]);
  const premiumRaw = useMemo(() => (payoutRaw * BigInt(premiumBps)) / 10000n, [payoutRaw, premiumBps]);
  const premiumHuman = withCommas(formatUnits6(premiumRaw));

  // Contracts
  const token = useMemo(() => (signer ? new ethers.Contract(TOKEN, ERC20_ABI, signer) : null), [signer, TOKEN]);
  const cover = useMemo(() => (signer ? new ethers.Contract(COVER, COVER_ABI, signer) : null), [signer, COVER]);
  const oracle = useMemo(() => (signer ? new ethers.Contract(ORACLE, ORACLE_ABI, signer) : null), [signer, ORACLE]);

  /* --------------------------------- Reads --------------------------------- */

  const readAll = async () => {
    setErr("");
    try {
      if (provider && address) {
        const erc20 = new ethers.Contract(TOKEN, ERC20_ABI, provider);
        const bal = (await erc20.balanceOf(address)) as bigint;
        const alw = (await erc20.allowance(address, COVER)) as bigint;
        setMyBal(bal);
        setAllowance(alw);
      }
    } catch {}
    try {
      const cov = new ethers.Contract(COVER, COVER_ABI, provider ?? undefined);
      if ((cov as any).poolBalance) {
        const pb = (await cov.poolBalance()) as bigint;
        setPoolBalance(pb);
      }
      if ((cov as any).premiumBps) {
        const b = (await cov.premiumBps()) as number;
        setPremiumBps(Number(b));
      }
      if (address && (cov as any).policies) {
        const [exp, pay, act] = (await cov.policies(address)) as [bigint, bigint, boolean];
        setPolicyActive(act);
        setPolicyPayout(pay);
        setPolicyExpiry(Number(exp));
      }
    } catch {}
    try {
      const orc = new ethers.Contract(ORACLE, ORACLE_ABI, provider ?? undefined);
      const [, answer] = (await orc.latestRoundData()) as [bigint, bigint, bigint, bigint, bigint];
      const scaled = Number(answer) / 1e8; // demo oracle: 8 decimals
      setOraclePrice(isFinite(scaled) ? scaled.toFixed(6) : "—");
    } catch {}
  };

  useEffect(() => {
    if (provider) readAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, address]);

  // countdown display (FIXED)
  useEffect(() => {
    if (!policyActive || !policyExpiry) {
      setCountdown("—");
      return;
    }
    const id = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const diff = Math.max(0, policyExpiry - now);
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setCountdown(`${h}h ${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(id);
  }, [policyActive, policyExpiry]);

  /* --------------------------------- Actions -------------------------------- */

  const requireWallet = () => {
    if (!signer) throw new Error("Connect wallet first");
    if (wrongChain) throw new Error("Wrong network. Switch to Sepolia.");
  };

  const handleMintDemo = async () => {
    try {
      requireWallet();
      setBusy("Minting 10,000 mUSD");
      setErr("");
      if (!token || !address) throw new Error("Token not ready");
      const amt = 10_000n * 10n ** TOKEN_DECIMALS; // 10k mUSD
      const tx = await token.mint(address, amt);
      await tx.wait();
      await readAll();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setBusy("");
    }
  };

  const handleFund = async () => {
    try {
      requireWallet();
      setBusy("Funding pool");
      setErr("");
      if (!token || !cover || !address) throw new Error("Contracts not ready");
      const amt = parseUnits6(fundStr);
      if (amt === null) throw new Error("Invalid fund amount");
      const alw = (await token.allowance(address, COVER)) as bigint;
      if (alw < amt) {
        const txA = await token.approve(COVER, amt);
        await txA.wait();
      }
      const tx = await cover.fundPool(amt);
      await tx.wait();
      await readAll();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setBusy("");
    }
  };

  const handleBuy = async () => {
  try {
    requireWallet();
    setBusy("Buying policy");
    setErr("");
    if (!token || !cover || !address) throw new Error("Contracts not ready");

    const dur = Number(durationSec);
    if (!isFinite(dur) || dur <= 0) throw new Error("Bad duration");

    // Pull live state for pre-checks
    const [pool, bps, policy, bal, alw] = await Promise.all([
      cover.poolBalance(),
      cover.premiumBps(),
      cover.policies(address),
      token.balanceOf(address),
      token.allowance(address, COVER),
    ]);

    const payout = payoutRaw;
    if (payout <= 0n) throw new Error("Bad payout");
    if (policy[2] === true) throw new Error("You already have an active policy");
    if (payout >= (pool as bigint)) throw new Error("Payout must be less than available pool");

    const premium = (payout * BigInt(bps as number)) / 10000n;
    if ((bal as bigint) < premium) throw new Error(`Insufficient balance: need ${ethers.formatUnits(premium, 6)} mUSD`);
    if ((alw as bigint) < premium) {
      const txA = await token.approve(COVER, premium);
      await txA.wait();
    }

    // Send buy tx
    const tx = await cover.buyPolicy(dur, payout);
    await tx.wait();
    await readAll();
  } catch (e: any) {
    setErr(e?.reason || e?.message || String(e));
  } finally {
    setBusy("");
  }
};


  const handleTrigger = async () => {
    try {
      requireWallet();
      setBusy("Triggering payout");
      setErr("");
      if (!cover || !address) throw new Error("Cover not ready");
      const tx = await cover.triggerAndPayout(address);
      await tx.wait();
      await readAll();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setBusy("");
    }
  };

  const handleSetPrice = async () => {
    try {
      requireWallet();
      setBusy("Setting oracle price");
      setErr("");
      if (!oracle) throw new Error("Oracle not ready");
      const n = Number(priceStr);
      if (!isFinite(n)) throw new Error("Bad price");
      const raw = Math.round(n * 1e8); // 8-dec oracle
      const tx = await oracle.setPrice(raw);
      await tx.wait();
      await readAll();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setBusy("");
    }
  };

  /* ----------------------------------- UI ---------------------------------- */

  return (
    <div className="min-h-screen text-white relative overflow-hidden">
      {/* neon background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-32 w-[40rem] h-[40rem] rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-32 w-[40rem] h-[40rem] rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,#0ea5e94d,transparent_40%),radial-gradient(circle_at_80%_50%,#a21caf33,transparent_35%)]" />
      </div>

      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="text-xl font-bold tracking-wide">DSRPT • Depeg Cover</div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={refresh}>Refresh</Button>
          {chainId === SEPOLIA_ID_DEC ? (
            <span className="px-3 py-2 rounded-xl border border-emerald-400/40 text-emerald-300">
              {networkName || "sepolia"}
            </span>
          ) : (
            <Button onClick={switchToSepolia}>Switch to Sepolia</Button>
          )}
          {address ? (
            <span className="px-3 py-2 rounded-xl border border-white/10">{short(address)}</span>
          ) : (
            <Button onClick={connect}>Connect</Button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pb-20">
        {err && (
          <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm">
            ⚠ {err}
          </div>
        )}
        {busy && (
          <div className="mb-4 rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-4 py-3 text-sm">
            ⏳ {busy}…
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-5">
          <Card title="Wallet">
            <div className="text-sm mb-2">Token: {DEFAULTS.token}</div>
            <div className="text-sm mb-4">Cover: {DEFAULTS.cover}</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-white/60 text-xs mb-1">Your mUSD</div>
                <div className="text-lg font-semibold">
                  {withCommas(formatUnits6(myBal))}
                </div>
              </div>
              <div>
                <div className="text-white/60 text-xs mb-1">Pool mUSD</div>
                <div className="text-lg font-semibold">
                  {withCommas(formatUnits6(poolBalance))}
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={handleMintDemo}>Mint 10k mUSD</Button>
              <Button variant="ghost" onClick={readAll}>Sync</Button>
            </div>
          </Card>

          <Card title="Policy Builder">
            <Field
              label="Payout (mUSD)"
              value={payoutStr}
              onChange={setPayoutStr}
              right={<span className="text-white/60 text-sm">≈ Premium {premiumHuman} mUSD @ {premiumBps / 100}%</span>}
            />
            <Field
              label="Duration (seconds)"
              value={durationSec}
              onChange={setDurationSec}
              placeholder="604800"
            />
            <div className="flex gap-2">
              <Button onClick={handleBuy} disabled={!address || wrongChain}>
                Buy Policy
              </Button>
              <Button variant="ghost" onClick={() => { setPayoutStr("1000"); setDurationSec("604800"); }}>
                Reset
              </Button>
            </div>

            {/* Policy Preview */}
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-3">
              <div className="text-xs text-white/60 mb-1">Preview</div>
              <div className="text-sm">
                <div>Premium: <span className="font-semibold">{premiumHuman} mUSD</span></div>
                <div>Payout: <span className="font-semibold">{withCommas(formatUnits6(payoutRaw))} mUSD</span></div>
                <div>Time left: <span className="font-semibold">{countdown}</span></div>
              </div>
            </div>
          </Card>

          <Card title="Oracle & Triggers">
            <Field
              label="Oracle Price (USD)"
              value={priceStr}
              onChange={setPriceStr}
              right={<span className="text-white/60 text-sm">live: {oraclePrice}</span>}
            />
            <div className="flex gap-2 mb-4">
              <Button onClick={handleSetPrice}>Set Price</Button>
              <Button variant="danger" onClick={handleTrigger}>Trigger Payout</Button>
            </div>
            <div className="text-sm grid gap-1">
              <div>Active: <span className="font-semibold">{policyActive ? "Yes" : "No"}</span></div>
              <div>My payout: <span className="font-semibold">{withCommas(formatUnits6(policyPayout))} mUSD</span></div>
              <div>Expiry: <span className="font-semibold">{policyExpiry ? new Date(policyExpiry * 1000).toLocaleString() : "—"}</span></div>
              <div>Time left: <span className="font-semibold">{countdown}</span></div>
            </div>
          </Card>
        </div>

        <div className="grid md:grid-cols-3 gap-5 mt-5">
          <Card title="Fund Pool">
            <Field label="Amount (mUSD)" value={fundStr} onChange={setFundStr} />
            <Button onClick={handleFund}>Approve & Fund</Button>
            <div className="text-xs text-white/60 mt-2">
              Allowance: {withCommas(formatUnits6(allowance))} mUSD
            </div>
          </Card>

          <Card title="Network">
            <div className="text-sm mb-3">Current: <span className="font-semibold">{networkName || "—"}</span></div>
            <div className="flex gap-2">
              <Button onClick={switchToSepolia}>Switch/Add Sepolia</Button>
              <Button variant="ghost" onClick={connect}>Reconnect</Button>
            </div>
          </Card>

          <Card title="About">
            <div className="text-sm leading-relaxed">
              Parametric depeg cover for stablecoins. Premium = payout × bps / 10,000. Demo oracle has 8 decimals.
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
