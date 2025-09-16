"use client";
import { useParams } from "next/navigation";
// Read details from chain or your indexer/DB
export default function PolicyDetail() {
  const { id } = useParams<{ id: string }>();
  return (
    <main style={{maxWidth:800, margin:"24px auto"}}>
      <h1>Policy #{id}</h1>
      <p>Coming soon: onchain fields, metadata, claim trigger visualization, TX history.</p>
    </main>
  );
}
