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
  cover: (process.env.NEXT_PUBLIC_COVER ??
    "0x34f6bCE92A6E1c142B7089Ae66Be62CFdc9A3e8B") as `0x${string}`,
};

const SEPOLIA_ID_DEC = 11155111;
const SEPOLIA_ID_HEX = "0xaa36a7";
const PUBLIC_RPC = process.env.NEXT_PUBLIC_SEPOLIA_RPC ?? ""; // used when adding chain

const TOKEN_DECIMALS = 6n; // MockUSD = 6
const PREMIUM_BPS = 500n; // 5% of payout

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
  "function mint(address,uint256)", // mock
] as const;

const ORACLE_ABI = [
  "function setPrice(int256) external",
  "function latestRoundData() view returns (uint80, int256, uint256, uint256, uint80)",
] as const;

const COVER_ABI = [
  "function fundPool(uint256) external",
  "function buyPolicy(uint64) external",
  "function triggerAndPayout(address) external",
  // Optional view; your solidity may include this:
  "function poolBalance() view returns (uint256)",
] as const;

/* -------------------------------------------------------------------------- */
/*                                   HELPERS                                  */
/* -------------------------------------------------------------------------- */

function numToRaw6(v: string): bigint | null {
  if (!v?.trim()) return 0n;
  if (!isFinite(Number(v))) return null;
  const [i, f = ""] = v.split(".");
  const frac = (f + "000000").slice(0, 6);
  return BigInt(i || "0") * 10n ** TOKEN_DECIMALS + BigInt(frac || "0");
}
function fromRaw6(x?: bigint) {
  if (x === undefined || x === null) return "-";
  return ethers.formatUnits(x, Number(TOKEN_DECIMALS));
}
function withCommas(n: string) {
  const [i, f] = n.split(".");
  return `${i.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${f ? "." + f : ""}`;
}
function secToExpiryISO(seconds: string): string {
  const s = Number(seconds || "0");
  if (!isFinite(s) || s <= 0) return "—";
  const d = new Date(Date.now() + s * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(
    2,
    "0"
  )} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(
    d.getSeconds()
  ).padStart(2, "0")}`;
}

/* ------------------------------- Network Guard ------------------------------- */

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

  return { provider, signer, address, chainId, networkName, connect, switchToSepolia };
}

/* --------------------------------- UI Bits --------------------------------- */

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string };
const GhostBtn: React.FC<BtnProps> = ({ className = "", ...p }) => (
  <button
    {...p}
    className={`px-3 py-2 rounded-xl border border-white/20 hover:bg-white/10 transition disabled:opacity-50 ${className}`}
  />
);
const PrimaryBtn: React.FC<BtnProps> = ({ className = "", ...p }) => (
  <button
    {...p}
    className={`px-3 py-2 rounded-xl bg-cyan-400 text-black font-semibold hover:bg-cyan-300 disabled:opacity-50 ${className}`}
  />
);

const Card: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({
  title,
  children,
  className = "",
}) => (
  <div className={`rounded-2xl border border-white/10 bg-white/[0.03] p-5 ${className}`}>
    <div className="text-sm uppercase tracking-wide text-white/60 mb-2">{title}</div>
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
  const { provider, signer, address, chainId, networkName, connect, switchToSepolia } = useInjected();

  // Addresses (env overrides supported)
  const TOKEN = DEFAULTS.token;
  const ORACLE = DEFAULTS.oracle;
  const COVER = DEFAULTS.cover;

  // Local state
  const [poolBalance, setPoolBalance] = useState<bigint>(0n);
  const [myBal, setMyBal] = useState<bigint>(0n);
  const [allowance, setAllowance] = useState<bigint>(0n);
  const [oraclePrice, setOraclePrice] = useState<string>("1.000000"); // human
  const [payoutStr, setPayoutStr] = useState<string>("1000");
  const [durationSec, setDurationSec] = useState<string>("604800");
  const [fundStr, setFundStr] = useState<string>("20000");

  // UX
  const [busy, setBusy] = useState<string>(""); // which action is in-flight
  const [err, setErr] = useState<string>(""); // last human-readable error
  const wrongChain = chainId !== null && chainId !== SEPOLIA_ID_DEC;

  // Derived
  const payoutRaw = useMemo(() => numToRaw6(payoutStr) ?? 0n, [payoutStr]);
  const premiumRaw = useMemo(() => (payoutRaw * PREMIUM_BPS) / 10000n, [payoutRaw]);

  // Contracts
  const token = useMemo(() => (signer ? new ethers.Contract(TOKEN, ERC20_ABI, signer) : null), [signer, TOKEN]);
  const cover = useMemo(() => (signer ? new ethers.Contract(COVER, COVER_ABI, signer) : null), [signer, COVER]);
  const oracle = useMemo(() => (signer ? new ethers.Contract(ORACLE, ORACLE_ABI, signer) : null), [signer, ORACLE]);

  /* --------------------------------- Reads --------------------------------- */

  const readState = async () => {
    setErr("");
    try {
      if (provider && address) {
        const erc20 = new ethers.Contract(TOKEN, ERC20_ABI, provider);
        const bal = (await erc20.balanceOf(address)) as bigint;
        const alw = (await erc20.allowance(address, COVER)) as bigint;
        setMyBal(bal);
        setAllowance(alw);
      }
    } catch (e: any) {
      // ignore
    }
    try {
      const cov = new ethers.Contract(COVER, COVER_ABI, provider ?? undefined);
      if ((cov as any).poolBalance) {
        const pb = (await cov.poolBalance()) as bigint;
        setPoolBalance(pb);
      }
    } catch {
      // optional
    }
    try {
      const orc = new ethers.Contract(ORACLE, ORACLE_ABI, provider ?? undefined);
      const [, answer] = (await orc.latestRoundData()) as [bigint, bigint, bigint, bigint, bigint];
      const scaled = Number(answer) / 1e8; // assume 8 decimals chainlink-style
      setOraclePrice(isFinite(scaled) ? scaled.toFixed(6) : "—");
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (provider && address) readState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, address]);

  /* -------------------------------- Actions -------------------------------- */

  async function guardReady() {
    if (!address) throw new Error("Connect your wallet first.");
    if (wrongChain) throw new Error("Wrong network. Please switch to Sepolia.");
    if (!signer) throw new Error("No signer available.");
  }

  const doApprovePremium = async () => {
    try {
      await guardReady();
      if (!token) throw new Error("Token not set");
      if (premiumRaw <= 0n) throw new Error("Premium must be > 0");
      setBusy("approve-premium");
      const tx = await token.approve(COVER, premiumRaw);
      await tx.wait?.();
      await readState();
    } catch (e: any) {
      setErr(e?.message || "Approve failed");
    } finally {
      setBusy("");
    }
  };

  const doBuyPolicy = async () => {
    try {
      await guardReady();
      if (!cover || !token) throw new Error("Contracts not ready");
      if (premiumRaw <= 0n) throw new Error("Premium must be > 0");
      // Auto-approve if allowance is short
      if (allowance < premiumRaw) {
        setBusy("approve-premium-auto");
        const txA = await token.approve(COVER, premiumRaw);
        await txA.wait?.();
        await readState();
      }
      const dur = BigInt(durationSec || "0");
      if (dur <= 0n) throw new Error("Duration must be > 0");
      setBusy("buy");
      const tx = await cover.buyPolicy(Number(dur)); // uint64 OK
      await tx.wait?.();
      await readState();
    } catch (e: any) {
      setErr(e?.message || "Buy policy failed");
    } finally {
      setBusy("");
    }
  };

  const doFundPool = async () => {
    try {
      await guardReady();
      if (!cover || !token) throw new Error("Contracts not ready");
      const amt = numToRaw6(fundStr) ?? 0n;
      if (amt <= 0n) throw new Error("Fund amount must be > 0");
      setBusy("approve-fund");
      const txA = await token.approve(COVER, amt);
      await txA.wait?.();
      setBusy("fund");
      const txF = await cover.fundPool(amt);
      await txF.wait?.();
      await readState();
    } catch (e: any) {
      setErr(e?.message || "Funding failed");
    } finally {
      setBusy("");
    }
  };

  const doSetPrice = async () => {
    try {
      await guardReady();
      if (!oracle) throw new Error("Oracle not set");
      const [i, f = ""] = oraclePrice.split(".");
      const pad = (f + "00000000").slice(0, 8);
      const raw = BigInt(`${i || "0"}${pad}`);
      setBusy("price");
      const tx = await oracle.setPrice(raw);
      await tx.wait?.();
      await readState();
    } catch (e: any) {
      setErr(e?.message || "Set price failed");
    } finally {
      setBusy("");
    }
  };

  const doTrigger = async () => {
    try {
      await guardReady();
      if (!cover) throw new Error("Cover not set");
      setBusy("trigger");
      const tx = await cover.triggerAndPayout(address);
      await tx.wait?.();
      await readState();
    } catch (e: any) {
      setErr(e?.message || "Trigger failed");
    } finally {
      setBusy("");
    }
  };

  /* ---------------------------------- UI ---------------------------------- */

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="text-xl font-semibold tracking-wide">
            DSRPT <span className="text-cyan-400">Depeg Cover</span>
          </div>
          <div className="flex items-center gap-3">
            {address && <div className="text-xs text-white/70 hidden sm:block">{networkName}</div>}
            <GhostBtn onClick={connect}>{address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Connect Wallet"}</GhostBtn>
          </div>
        </div>
      </header>

      {/* Wrong network */}
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
              <PrimaryBtn onClick={switchToSepolia}>Switch to Sepolia</PrimaryBtn>
            </div>
          </div>
        </div>
      )}

      {/* Error / Status */}
      <div className="max-w-6xl mx-auto px-6 mt-3 space-y-2">
        {busy && (
          <div className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-sm">
            <span className="font-medium">Working:</span> {busy}
          </div>
        )}
        {err && (
          <div className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm">
            <span className="font-medium">Error:</span> {err}
          </div>
        )}
      </div>

      {/* Top cards */}
      <section className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid md:grid-cols-3 gap-5">
          <Card title="Active Contracts">
            <div className="text-xs space-y-1 font-mono break-all">
              <div>Token: <span className="text-cyan-300">{TOKEN}</span></div>
              <div>Oracle: <span className="text-cyan-300">{ORACLE}</span></div>
              <div>Cover: <span className="text-cyan-300">{COVER}</span></div>
            </div>
            <div className="mt-4 flex gap-2">
              <GhostBtn onClick={readState}>Refresh State</GhostBtn>
            </div>
          </Card>

          <Card title="Your Wallet">
            <div className="text-sm">
              <div className="flex items-center justify-between">
                <div className="text-white/70">mUSD Balance</div>
                <div className="font-mono">{withCommas(fromRaw6(myBal))}</div>
              </div>
              <div className="flex items-center justify-between mt-1">
                <div className="text-white/70">Allowance → Cover</div>
                <div className="font-mono">{withCommas(fromRaw6(allowance))}</div>
              </div>
            </div>
          </Card>

          <Card title="Pool / Oracle">
            <div className="text-sm">
              <div className="flex items-center justify-between">
                <div className="text-white/70">Pool Balance</div>
                <div className="font-mono">{withCommas(fromRaw6(poolBalance))}</div>
              </div>
              <div className="flex items-center justify-between mt-1">
                <div className="text-white/70">Oracle Price</div>
                <div className="font-mono">{oraclePrice}</div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Coverage Builder + Policy Preview + Owner Controls */}
      <section className="max-w-6xl mx-auto px-6 pb-10">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Builder */}
          <div className="lg:col-span-2">
            <Card title="Coverage Builder">
              <Field
                label="Desired Payout (mUSD)"
                value={payoutStr}
                onChange={setPayoutStr}
                placeholder="1000"
                right={<div className="text-xs text-white/60 pr-1">mUSD</div>}
                type="number"
              />
              <Field
                label="Duration (seconds)"
                value={durationSec}
                onChange={setDurationSec}
                placeholder="604800"
                type="number"
              />
              <div className="flex items-center justify-between mt-2 text-sm">
                <div className="text-white/70">Premium (5%)</div>
                <div className="font-mono">{withCommas(fromRaw6(premiumRaw))}</div>
              </div>
              <div className="mt-4 flex gap-2">
                <PrimaryBtn onClick={doApprovePremium} disabled={!address || wrongChain || premiumRaw === 0n || !!busy}>
                  {busy === "approve-premium" ? "Approving…" : "Approve Premium"}
                </PrimaryBtn>
                <PrimaryBtn
                  onClick={doBuyPolicy}
                  disabled={!address || wrongChain || premiumRaw === 0n || !!busy}
                >
                  {busy?.startsWith("approve-premium-auto") || busy === "buy" ? "Buying…" : "Buy Policy"}
                </PrimaryBtn>
              </div>
            </Card>
          </div>

          {/* Policy Preview */}
          <Card title="Policy Preview">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-white/70">Payout</span>
                <span className="font-mono">{withCommas(fromRaw6(payoutRaw))}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70">Premium (5%)</span>
                <span className="font-mono">{withCommas(fromRaw6(premiumRaw))}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70">Duration</span>
                <span className="font-mono">
                  {Number(durationSec || "0") > 0 ? `${Number(durationSec)}s` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70">Est. Expiry (local)</span>
                <span className="font-mono">{secToExpiryISO(durationSec)}</span>
              </div>
              <div className="h-px bg-white/10" />
              <div className="text-xs text-white/60">
                Parametric cover: if the oracle price drops below the threshold during your coverage window, payout equals
                the selected amount.
              </div>
            </div>
          </Card>
        </div>

        {/* Owner / Oracle Controls */}
        <div className="grid lg:grid-cols-2 gap-6 mt-6">
          <Card title="Pool Funding">
            <Field
              label="Fund Amount (mUSD)"
              value={fundStr}
              onChange={setFundStr}
              placeholder="20000"
              type="number"
            />
            <div className="flex gap-2">
              <PrimaryBtn onClick={doFundPool} disabled={!address || wrongChain || !!busy}>
                {busy === "approve-fund" || busy === "fund" ? "Funding…" : "Approve & Fund Pool"}
              </PrimaryBtn>
            </div>
          </Card>

          <Card title="Oracle / Payout">
            <Field
              label="Oracle Price (e.g., 0.960000)"
              value={oraclePrice}
              onChange={setOraclePrice}
              placeholder="0.970000"
              type="text"
            />
            <div className="flex gap-2">
              <GhostBtn onClick={doSetPrice} disabled={!address || wrongChain || !!busy}>
                {busy === "price" ? "Setting…" : "Set Oracle Price"}
              </GhostBtn>
              <PrimaryBtn onClick={doTrigger} disabled={!address || wrongChain || !!busy}>
                {busy === "trigger" ? "Triggering…" : "Trigger Payout"}
              </PrimaryBtn>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-xs text-white/40">
        DSRPT • Parametric USDC/USDT depeg cover • Sepolia demo
      </footer>
    </main>
  );
}
