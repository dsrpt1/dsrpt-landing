"use client";
import { ConnectButton } from "@rainbow-me/rainbowkit";
export default function Header() {
  return (
    <header style={{display:'flex',justifyContent:'space-between',padding:'12px 16px',borderBottom:'1px solid #eee'}}>
      <div style={{fontWeight:600}}>DSRPT</div>
      <ConnectButton />
    </header>
  );
}
