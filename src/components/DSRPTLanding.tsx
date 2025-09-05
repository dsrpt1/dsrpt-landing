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
function expiryIso(secondsFromNow: string): string {
  const s = Number(secondsFromNow || "0");
  if (!isFinite(s) || s <= 0) return "—";
  const d = new Date(Date.now() + s * 1000);
  return d.toLocaleString();
}
function short(addr?: string) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";
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
  const { provider, signer, address, chainId, networkName, connect, switchToSepolia } = useInjected();

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

  // countdown
  useEffect(() => {
    if (!policyActive || !policyExpiry
