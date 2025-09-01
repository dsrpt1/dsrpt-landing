"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";

/* ------------------------------ Constants ------------------------------ */

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
const PUBLIC_RPC = process.env.NEXT_PUBLIC_SEPOLIA_RPC ?? ""; // optional, used when adding chain

// UI constants (feel free to tweak)
const PREMIUM_BPS = 500n; // 5% (per 10_000)
const TOKEN_DECIMALS = 6n; // MockUSD = 6 decimals

/* --------------------------------- ABIs -------------------------------- */

// Minimal ERC20
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function mint(address,uint256)", // mock-only
] as const;

// Minimal Oracle (mock)
const ORACLE_ABI = [
  "function setPrice(int256) external",
  "function latestRoundData() view returns (uint80, int256, uint256, uint256, uint80)",
] as const;

// Minimal Cover
const COVER_ABI = [
  "function fundPool(uint256) external",
  "function buyPolicy(uint64 durationSeconds) external",
  "function triggerAndPayout(address user) external",
  // views (if your contract exposes them – these are optional helpers)
  "function poolBalance() view returns (uint256)",
] as const;

/* ------------------------- Helpers / formatting ------------------------- */

function toUnits(n: bigint, decimals: bigint = TOKEN_DECIMALS) {
  return ethers.parseUnits(n.toString(), Number(decimals));
}
function fromUnits(x?: bigint, decimals: bigint = TOKEN_DECIMALS) {
  if (x === undefined) return "-";
  return ethers.formatUnits(x, Number(decimals));
}
function numToBig(value: string): bigint | null {
  if (!value || isNaN(Number(value))) return null;
  // value is decimal string (e.g., "1000")
  const [intPart, fracPart = ""] = value.split(".");
  const frac = (fracPart + "000000").slice(0, 6); // 6 decimals
  const raw = BigInt(intPart || "0") * 10n ** TOKEN_DECIMALS + BigInt(frac || "0");
  return raw;
}

/* ----------------------------- Network Guard ---------------------------- */

async function ensureSepolia(): Promise<void> {
  const eth = (globalThis as any).ethereum;
  if (!eth) throw new Error("No injected wallet found");

  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SEPOLIA_ID_HEX }],
    });
  } catch (err: unknown) {
    const e = err as { code?: number; message?: string };
    if (e?.code === 4902) {
      // Add chain then retry switch
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
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_ID_HEX }],
      });
    } else {
      throw err;
    }
  }
}

/* ------------------------------ Wallet Hook ---------------------------- */

type InjectedState = {
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
  address: string;
  chainId: number | null;
  networkName: string;
  connect: () => Promise<void>;
  switchToSepolia: () => Promise<void>;
};

function useInjected(): InjectedState {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [address, setAddress] = useState<string>("");
  const [chainId, setChainId] = useState<number | null>(null);
  const [networkName, setNetworkName] = useState<string>("");

  const refreshFromEth = async () => {
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
    await refreshFromEth();
  };

  const switchToSepolia = async () => {
    await ensureSepolia();
    await refreshFromEth();
  };

  useEffect(() => {
    const eth = (globalThis as any).ethereum;
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

/* ------------------------------ UI Elements ---------------------------- */

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string };
const GhostBtn: React.FC<BtnProps> = ({ className = "", ...p }) => (
  <button
    {...p}
    className={`px-3 py-2 rounded-xl border border-white/20 hover:bg-white/10 transition ${className}`}
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

/* ------------------------------- Component ----------------------------- */

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
  const [oraclePrice, setOraclePrice] = useState<string>("1.000000"); // human (1.000000)
  const [payoutStr, setPayoutStr] = useState<string>("1000"); // desired payout in mUSD (human)
  const [durationSec, setDurationSec] = useState<string>("604800"); // 7d
  const [fundStr, setFundStr] = useState<string>("20000");

  const payoutRaw = useMemo(() => numToBig(payoutStr) ?? 0n, [payoutStr]);
  const premiumRaw = useMemo(() => (payoutRaw * PREMIUM_BPS) / 10000n, [payoutRaw]);

  const token = useMemo(
    () => (signer ? new ethers.Contract(TOKEN, ERC20_ABI, signer) : null),
    [signer, TOKEN]
  );
  const cover = useMemo(
    () => (signer ? new ethers.Contract(COVER, COVER_ABI, signer) : null),
    [signer, COVER]
  );
  const oracle = useMemo(
    () => (signer ? new ethers.Contract(ORACLE, ORACLE_ABI, signer) : null),
    [signer, ORACLE]
  );

  const readState = async () => {
    if (!provider || !address) return;
    try {
      const erc20 = new ethers.Contract(TOKEN, ERC20_ABI, provider);
      const bal = (await erc20.balanceOf(address)) as bigint;
      const alw = (await erc20.allowance(address, COVER)) as bigint;
      setMyBal(bal);
      setAllowance(alw);
    } catch {
      // ignore read errors
    }
    try {
      const cov = new ethers.Contract(COVER, COVER_ABI, provider);
      if (cov.poolBalance) {
        const pb = (await cov.poolBalance()) as bigint;
        setPoolBalance(pb);
      }
    } catch {
      // optional view might not exist
    }
    try {
      const orc = new ethers.Contract(ORACLE, ORACLE_ABI, provider);
      const [, answer] = (await orc.latestRoundData()) as [bigint, bigint, bigint, bigint, bigint];
      // Assume price has 8 decimals (Chainlink style). Render as 1.000000
      const scaled = Number(answer) / 1e8;
      setOraclePrice(scaled.toFixed(6));
    } catch {
      // ignore
    }
  };

  /* ------------------------------- Actions ------------------------------ */

  const doApprovePremium = async () => {
    if (!token) return;
    const tx = await token.approve(COVER, premiumRaw);
    await tx.wait?.();
    await readState();
  };

  const doBuyPolicy = async () => {
    if (!cover) return;
    const dur = BigInt(Number(durationSec) || 0);
    const tx = await cover.buyPolicy(Number(dur)); // contract expects uint64; ethers will coerce
    await tx.wait?.();
  };

  const doFundPool = async () => {
    if (!token || !cover) return;
    const amt = numToBig(fundStr) ?? 0n;
    const approveTx = await token.approve(COVER, amt);
    await approveTx.wait?.();
    const fundTx = await cover.fundPool(amt);
    await fundTx.wait?.();
    await readState();
  };

  const doTrigger = async () => {
    if (!cover) return;
    const tx = await cover.triggerAndPayout(address);
    await tx.wait?.();
    await readState();
  };

  const doSetPrice = async () => {
    if (!oracle) return;
    // Expect oracle to store 8-decimals price like 0.96000000 = 96000000
    const [intPart, frac = ""] = oraclePrice.split(".");
    const pad = (frac + "00000000").slice(0, 8);
    const raw = BigInt(`${intPart || "0"}${pad}`); // int256
    const tx = await oracle.setPrice(raw);
    await tx.wait?.();
    await readState();
  };

  useEffect(() => {
    if (provider && address) readState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, address]);

  /* --------------------------------- UI --------------------------------- */

  const wrongChain = chainId !== null && chainId !== SEPOLIA_ID_DEC;

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="text-xl font-semibold tracking-wide">
            DSRPT <span className="text-cyan-400">Depeg Cover</span>
          </div>
          <div className="flex items-center gap-3">
            {address && (
              <div className="text-xs text-white/70 hidden sm:block">
                {networkName || (chainId ?? "—")}
              </div>
            )}
            <GhostBtn onClick={connect}>
              {address
                ? `${address.slice(0, 6)}…${address.slice(-4)}`
                : "Connect Wallet"}
            </GhostBtn>
          </div>
        </div>
      </header>

      {/* Wrong network banner */}
      {wrongChain && (
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

      {/* Hero / Addresses */}
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
                <div className="font-mono">{fromUnits(myBal)}</div>
              </div>
              <div className="flex items-center justify-between mt-1">
                <div className="text-white/70">Allowance → Cover</div>
                <div className="font-mono">{fromUnits(allowance)}</div>
              </div>
            </div>
          </Card>

          <Card title="Pool / Oracle">
            <div className="text-sm">
              <div className="flex items-center justify-between">
                <div className="text-white/70">Pool Balance</div>
                <div className="font-mono">{fromUnits(poolBalance)}</div>
              </div>
              <div className="flex items-center justify-between mt-1">
                <div className="text-white/70">Oracle Price</div>
                <div className="font-mono">{oraclePrice}</div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Coverage Builder */}
      <section className="max-w-6xl mx-auto px-6 pb-10">
        <div className="grid lg:grid-cols-2 gap-6">
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
              <div className="font-mono">{fromUnits(premiumRaw)}</div>
            </div>
            <div className="mt-4 flex gap-2">
              <PrimaryBtn onClick={doApprovePremium} disabled={!address || wrongChain || premiumRaw === 0n}>
                Approve Premium
              </PrimaryBtn>
              <PrimaryBtn onClick={doBuyPolicy} disabled={!address || wrongChain || premiumRaw === 0n}>
                Buy Policy
              </PrimaryBtn>
            </div>
          </Card>

          <Card title="Owner / Oracle Controls">
            <Field
              label="Fund Amount (mUSD)"
              value={fundStr}
              onChange={setFundStr}
              placeholder="20000"
              type="number"
            />
            <div className="flex gap-2">
              <PrimaryBtn onClick={doFundPool} disabled={!address || wrongChain}>
                Approve & Fund Pool
              </PrimaryBtn>
            </div>

            <div className="h-px bg-white/10 my-4" />

            <Field
              label="Oracle Price (e.g., 0.960000)"
              value={oraclePrice}
              onChange={setOraclePrice}
              placeholder="0.970000"
              type="text"
            />
            <div className="flex gap-2">
              <GhostBtn onClick={doSetPrice} disabled={!address || wrongChain}>
                Set Oracle Price
              </GhostBtn>
              <PrimaryBtn onClick={doTrigger} disabled={!address || wrongChain}>
                Trigger Payout
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
