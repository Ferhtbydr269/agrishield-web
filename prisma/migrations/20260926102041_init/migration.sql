-- CreateTable
CREATE TABLE "Parcel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "village" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "crop" TEXT NOT NULL,
    "areaDonum" REAL NOT NULL,
    "soilType" TEXT NOT NULL,
    "irrigated" BOOLEAN NOT NULL DEFAULT false,
    "geojson" TEXT NOT NULL,
    "centroidLat" REAL NOT NULL,
    "centroidLng" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "Policy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parcelId" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "sumInsuredTl" INTEGER NOT NULL,
    "payoutRate" REAL NOT NULL,
    "premiumTl" INTEGER NOT NULL,
    "subsidyRate" REAL NOT NULL,
    "thresholds" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'aktif',
    CONSTRAINT "Policy_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "Parcel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Station" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "village" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "batteryV" REAL,
    "lastSeenAt" DATETIME,
    "tamper" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "Reading" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ts" DATETIME NOT NULL,
    "source" TEXT NOT NULL,
    "stationId" TEXT,
    "parcelId" TEXT,
    "soilMoisture" REAL,
    "airTempC" REAL,
    "humidity" REAL,
    "rainMm" REAL,
    "windMs" REAL,
    "ndvi" REAL,
    "ndmi" REAL,
    "cloudCover" REAL,
    "spi30" REAL,
    "flags" TEXT,
    "raw" TEXT,
    "scenario" TEXT,
    CONSTRAINT "Reading_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Reading_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "Parcel" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Decision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "ts" DATETIME NOT NULL,
    "parcelId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "witnessSat" TEXT NOT NULL,
    "witnessStation" TEXT NOT NULL,
    "witnessMeteo" TEXT NOT NULL,
    "yesCount" INTEGER NOT NULL,
    "outcome" TEXT NOT NULL,
    "amountTl" INTEGER,
    "evidence" TEXT NOT NULL,
    "evidenceHash" TEXT NOT NULL,
    "txHash" TEXT,
    "blockNumber" INTEGER,
    "paymentRef" TEXT,
    "notifiedAt" DATETIME,
    "simDate" TEXT NOT NULL,
    "scenario" TEXT NOT NULL,
    "runId" TEXT NOT NULL DEFAULT 'seed',
    "status" TEXT NOT NULL DEFAULT 'kesinlesti',
    "windowEndsAt" DATETIME,
    "chainMode" TEXT,
    "explorerUrl" TEXT,
    "paymentRefText" TEXT,
    "smsText" TEXT,
    "latencies" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Decision_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "Parcel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Decision_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChainBlock" (
    "number" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "hash" TEXT NOT NULL,
    "prevHash" TEXT NOT NULL,
    "ts" DATETIME NOT NULL,
    "kind" TEXT NOT NULL,
    "decisionCode" TEXT,
    "payload" TEXT NOT NULL,
    "txHash" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ts" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "detail" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "Reading_source_ts_idx" ON "Reading"("source", "ts");

-- CreateIndex
CREATE INDEX "Reading_parcelId_ts_idx" ON "Reading"("parcelId", "ts");

-- CreateIndex
CREATE UNIQUE INDEX "Decision_code_key" ON "Decision"("code");

-- CreateIndex
CREATE INDEX "Decision_parcelId_ts_idx" ON "Decision"("parcelId", "ts");

-- CreateIndex
CREATE INDEX "Decision_runId_idx" ON "Decision"("runId");

-- CreateIndex
CREATE INDEX "Decision_createdAt_idx" ON "Decision"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChainBlock_hash_key" ON "ChainBlock"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "ChainBlock_txHash_key" ON "ChainBlock"("txHash");

-- CreateIndex
CREATE INDEX "AuditLog_ts_idx" ON "AuditLog"("ts");
