-- CreateTable
CREATE TABLE "public"."Quote" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "wallet" TEXT,
    "perilId" TEXT NOT NULL,
    "regime" TEXT NOT NULL,
    "limitUSD" INTEGER NOT NULL,
    "attachmentPct" DECIMAL(10,6) NOT NULL,
    "tenorDays" INTEGER NOT NULL,
    "utilization" DECIMAL(10,6) NOT NULL,
    "headroomUSD" INTEGER NOT NULL,
    "premiumUSD" DECIMAL(18,2) NOT NULL,
    "EL" DECIMAL(18,2) NOT NULL,
    "RL" DECIMAL(18,2) NOT NULL,
    "LL" DECIMAL(18,2) NOT NULL,
    "OH" DECIMAL(18,2) NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Policy" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "wallet" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "contract" TEXT NOT NULL,
    "perilId" TEXT NOT NULL,
    "limitUSD" INTEGER NOT NULL,
    "attachmentPct" DECIMAL(10,6) NOT NULL,
    "tenorDays" INTEGER NOT NULL,
    "premiumUSD" DECIMAL(18,2) NOT NULL,
    "txHash" TEXT NOT NULL,
    "metadataCID" TEXT NOT NULL,
    "metadataURI" TEXT NOT NULL,

    CONSTRAINT "Policy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Quote_wallet_idx" ON "public"."Quote"("wallet");

-- CreateIndex
CREATE INDEX "Quote_createdAt_idx" ON "public"."Quote"("createdAt");

-- CreateIndex
CREATE INDEX "Quote_perilId_regime_idx" ON "public"."Quote"("perilId", "regime");

-- CreateIndex
CREATE INDEX "Policy_wallet_idx" ON "public"."Policy"("wallet");

-- CreateIndex
CREATE INDEX "Policy_contract_tokenId_idx" ON "public"."Policy"("contract", "tokenId");

-- CreateIndex
CREATE INDEX "Policy_createdAt_idx" ON "public"."Policy"("createdAt");
