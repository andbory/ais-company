-- AIS COMPANY Phase 2: foundational PostgreSQL schema.
-- The legacy invoice tables from 0001 are intentionally left untouched
-- until the old API is replaced in a later migration.

CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'VIEWER');
CREATE TYPE "PartyType" AS ENUM ('PERSON', 'OFFICE', 'COMPANY');
CREATE TYPE "CurrencyCode" AS ENUM ('USD', 'IQD', 'IRR_TOMAN', 'EUR', 'SAR');
CREATE TYPE "AccountDirection" AS ENUM ('WE_ARE_OWED', 'THEY_ARE_OWED');
CREATE TYPE "TransferDirection" AS ENUM ('SENT', 'RECEIVED');
CREATE TYPE "SettlementDirection" AS ENUM ('WE_PAID_THEM', 'THEY_PAID_US');
CREATE TYPE "FinancialOperationType" AS ENUM ('TRANSFER', 'SETTLEMENT', 'OPENING_BALANCE');
CREATE TYPE "BusinessNumberType" AS ENUM ('PERSON_TRANSFER', 'OFFICE_TRANSFER', 'COMPANY_TRANSFER', 'SETTLEMENT');
CREATE TYPE "SyncMutationStatus" AS ENUM ('PENDING', 'PROCESSING', 'ACKNOWLEDGED', 'FAILED');

CREATE TABLE "ais_users" (
  "id" UUID NOT NULL,
  "username" VARCHAR(64) NOT NULL,
  "passwordHash" VARCHAR(255) NOT NULL,
  "role" "UserRole" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "ais_users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ais_users_username_key" ON "ais_users"("username");
CREATE INDEX "ais_users_role_isActive_idx" ON "ais_users"("role", "isActive");

CREATE TABLE "ais_devices" (
  "id" UUID NOT NULL,
  "deviceKey" VARCHAR(128) NOT NULL,
  "label" VARCHAR(120),
  "lastSeenAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "ais_devices_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ais_devices_deviceKey_key" ON "ais_devices"("deviceKey");
CREATE INDEX "ais_devices_lastSeenAt_idx" ON "ais_devices"("lastSeenAt");

CREATE TABLE "ais_parties" (
  "id" UUID NOT NULL,
  "type" "PartyType" NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "phone" VARCHAR(50),
  "address" VARCHAR(500),
  "country" VARCHAR(100),
  "notes" VARCHAR(2000),
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "ais_parties_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ais_parties_type_name_idx" ON "ais_parties"("type", "name");
CREATE INDEX "ais_parties_isArchived_updatedAt_idx" ON "ais_parties"("isArchived", "updatedAt");

CREATE TABLE "ais_person_profiles" (
  "id" UUID NOT NULL,
  "partyId" UUID NOT NULL,
  CONSTRAINT "ais_person_profiles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ais_person_profiles_partyId_key" ON "ais_person_profiles"("partyId");

CREATE TABLE "ais_office_profiles" (
  "id" UUID NOT NULL,
  "partyId" UUID NOT NULL,
  "ownerName" VARCHAR(200),
  CONSTRAINT "ais_office_profiles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ais_office_profiles_partyId_key" ON "ais_office_profiles"("partyId");

CREATE TABLE "ais_company_profiles" (
  "id" UUID NOT NULL,
  "partyId" UUID NOT NULL,
  "responsibleName" VARCHAR(200),
  CONSTRAINT "ais_company_profiles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ais_company_profiles_partyId_key" ON "ais_company_profiles"("partyId");

CREATE TABLE "ais_opening_balances" (
  "id" UUID NOT NULL,
  "partyId" UUID NOT NULL,
  "currency" "CurrencyCode" NOT NULL,
  "direction" "AccountDirection" NOT NULL,
  "amount" DECIMAL(20,2) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "ais_opening_balances_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ais_opening_balances_amount_nonnegative" CHECK ("amount" >= 0)
);
CREATE UNIQUE INDEX "ais_opening_balances_partyId_currency_direction_key" ON "ais_opening_balances"("partyId", "currency", "direction");
CREATE INDEX "ais_opening_balances_partyId_currency_idx" ON "ais_opening_balances"("partyId", "currency");

CREATE TABLE "ais_transfers" (
  "id" UUID NOT NULL,
  "businessNumber" VARCHAR(32) NOT NULL,
  "partyId" UUID NOT NULL,
  "direction" "TransferDirection" NOT NULL,
  "date" DATE NOT NULL,
  "senderName" VARCHAR(200) NOT NULL,
  "recipientName" VARCHAR(200),
  "location" VARCHAR(200),
  "beneficiaryName" VARCHAR(200),
  "beneficiaryPhone" VARCHAR(50),
  "beneficiaryCountry" VARCHAR(100),
  "currency" "CurrencyCode" NOT NULL,
  "amount" DECIMAL(20,2) NOT NULL,
  "commission" DECIMAL(20,2) NOT NULL,
  "total" DECIMAL(20,2) NOT NULL,
  "notes" VARCHAR(2000),
  "version" INTEGER NOT NULL DEFAULT 1,
  "mutationId" VARCHAR(128),
  "deviceId" UUID,
  "createdById" UUID,
  "updatedById" UUID,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  "deletedAt" TIMESTAMPTZ(3),
  CONSTRAINT "ais_transfers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ais_transfers_amount_positive" CHECK ("amount" > 0),
  CONSTRAINT "ais_transfers_commission_nonnegative" CHECK ("commission" >= 0),
  CONSTRAINT "ais_transfers_total_exact" CHECK ("total" = "amount" + "commission")
);
CREATE UNIQUE INDEX "ais_transfers_businessNumber_key" ON "ais_transfers"("businessNumber");
CREATE UNIQUE INDEX "ais_transfers_mutationId_key" ON "ais_transfers"("mutationId");
CREATE INDEX "ais_transfers_partyId_date_idx" ON "ais_transfers"("partyId", "date");
CREATE INDEX "ais_transfers_direction_currency_date_idx" ON "ais_transfers"("direction", "currency", "date");
CREATE INDEX "ais_transfers_date_createdAt_idx" ON "ais_transfers"("date", "createdAt");
CREATE INDEX "ais_transfers_deletedAt_date_idx" ON "ais_transfers"("deletedAt", "date");

CREATE TABLE "ais_settlements" (
  "id" UUID NOT NULL,
  "businessNumber" VARCHAR(32) NOT NULL,
  "partyId" UUID NOT NULL,
  "date" DATE NOT NULL,
  "currency" "CurrencyCode" NOT NULL,
  "amount" DECIMAL(20,2) NOT NULL,
  "direction" "SettlementDirection" NOT NULL,
  "notes" VARCHAR(2000),
  "version" INTEGER NOT NULL DEFAULT 1,
  "mutationId" VARCHAR(128),
  "deviceId" UUID,
  "createdById" UUID,
  "updatedById" UUID,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  "deletedAt" TIMESTAMPTZ(3),
  CONSTRAINT "ais_settlements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ais_settlements_amount_positive" CHECK ("amount" > 0)
);
CREATE UNIQUE INDEX "ais_settlements_businessNumber_key" ON "ais_settlements"("businessNumber");
CREATE UNIQUE INDEX "ais_settlements_mutationId_key" ON "ais_settlements"("mutationId");
CREATE INDEX "ais_settlements_partyId_date_idx" ON "ais_settlements"("partyId", "date");
CREATE INDEX "ais_settlements_direction_currency_date_idx" ON "ais_settlements"("direction", "currency", "date");
CREATE INDEX "ais_settlements_deletedAt_date_idx" ON "ais_settlements"("deletedAt", "date");

CREATE TABLE "ais_ledger_effects" (
  "id" UUID NOT NULL,
  "partyId" UUID NOT NULL,
  "currency" "CurrencyCode" NOT NULL,
  "direction" "AccountDirection" NOT NULL,
  "amount" DECIMAL(20,2) NOT NULL,
  "operationType" "FinancialOperationType" NOT NULL,
  "transferId" UUID,
  "settlementId" UUID,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ais_ledger_effects_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ais_ledger_effects_amount_positive" CHECK ("amount" > 0)
);
CREATE INDEX "ais_ledger_effects_partyId_currency_direction_createdAt_idx" ON "ais_ledger_effects"("partyId", "currency", "direction", "createdAt");
CREATE INDEX "ais_ledger_effects_transferId_idx" ON "ais_ledger_effects"("transferId");
CREATE INDEX "ais_ledger_effects_settlementId_idx" ON "ais_ledger_effects"("settlementId");

CREATE TABLE "ais_audit_logs" (
  "id" UUID NOT NULL,
  "userId" UUID,
  "deviceId" UUID,
  "action" VARCHAR(40) NOT NULL,
  "entityType" VARCHAR(80) NOT NULL,
  "entityId" VARCHAR(128) NOT NULL,
  "reason" VARCHAR(1000),
  "oldValues" JSONB,
  "newValues" JSONB,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ais_audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ais_audit_logs_entityType_entityId_createdAt_idx" ON "ais_audit_logs"("entityType", "entityId", "createdAt");
CREATE INDEX "ais_audit_logs_userId_createdAt_idx" ON "ais_audit_logs"("userId", "createdAt");

CREATE TABLE "ais_sync_mutations" (
  "id" UUID NOT NULL,
  "mutationId" VARCHAR(128) NOT NULL,
  "entityType" VARCHAR(80) NOT NULL,
  "entityId" VARCHAR(128) NOT NULL,
  "operation" VARCHAR(20) NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "SyncMutationStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" VARCHAR(2000),
  "userId" UUID,
  "deviceId" UUID,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  "acknowledgedAt" TIMESTAMPTZ(3),
  CONSTRAINT "ais_sync_mutations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ais_sync_mutations_mutationId_key" ON "ais_sync_mutations"("mutationId");
CREATE INDEX "ais_sync_mutations_status_updatedAt_idx" ON "ais_sync_mutations"("status", "updatedAt");
CREATE INDEX "ais_sync_mutations_entityType_entityId_idx" ON "ais_sync_mutations"("entityType", "entityId");

CREATE TABLE "ais_number_blocks" (
  "id" UUID NOT NULL,
  "type" "BusinessNumberType" NOT NULL,
  "deviceId" UUID NOT NULL,
  "startNumber" INTEGER NOT NULL,
  "endNumber" INTEGER NOT NULL,
  "nextNumber" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMPTZ(3),
  CONSTRAINT "ais_number_blocks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ais_number_blocks_range_valid" CHECK ("startNumber" > 0 AND "endNumber" >= "startNumber" AND "nextNumber" >= "startNumber" AND "nextNumber" <= "endNumber" + 1)
);
CREATE INDEX "ais_number_blocks_type_deviceId_nextNumber_idx" ON "ais_number_blocks"("type", "deviceId", "nextNumber");

CREATE TABLE "ais_backup_metadata" (
  "id" UUID NOT NULL,
  "startedAt" TIMESTAMPTZ(3) NOT NULL,
  "completedAt" TIMESTAMPTZ(3),
  "status" VARCHAR(30) NOT NULL,
  "storageKey" VARCHAR(500),
  "checksum" VARCHAR(128),
  "sizeBytes" BIGINT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ais_backup_metadata_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ais_backup_metadata_status_startedAt_idx" ON "ais_backup_metadata"("status", "startedAt");

CREATE TABLE "ais_system_settings" (
  "key" VARCHAR(100) NOT NULL,
  "value" JSONB NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "ais_system_settings_pkey" PRIMARY KEY ("key")
);

ALTER TABLE "ais_person_profiles" ADD CONSTRAINT "ais_ais_person_profiles_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "ais_parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ais_office_profiles" ADD CONSTRAINT "ais_ais_office_profiles_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "ais_parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ais_company_profiles" ADD CONSTRAINT "ais_ais_company_profiles_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "ais_parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ais_opening_balances" ADD CONSTRAINT "ais_ais_opening_balances_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "ais_parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ais_transfers" ADD CONSTRAINT "ais_ais_transfers_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "ais_parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ais_transfers" ADD CONSTRAINT "ais_ais_transfers_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "ais_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ais_transfers" ADD CONSTRAINT "ais_ais_transfers_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "ais_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ais_transfers" ADD CONSTRAINT "ais_ais_transfers_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "ais_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ais_settlements" ADD CONSTRAINT "ais_ais_settlements_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "ais_parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ais_settlements" ADD CONSTRAINT "ais_ais_settlements_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "ais_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ais_settlements" ADD CONSTRAINT "ais_ais_settlements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "ais_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ais_settlements" ADD CONSTRAINT "ais_ais_settlements_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "ais_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ais_ledger_effects" ADD CONSTRAINT "ais_ais_ledger_effects_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "ais_parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ais_ledger_effects" ADD CONSTRAINT "ais_ais_ledger_effects_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "ais_transfers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ais_ledger_effects" ADD CONSTRAINT "ais_ais_ledger_effects_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "ais_settlements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ais_audit_logs" ADD CONSTRAINT "ais_ais_audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "ais_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ais_sync_mutations" ADD CONSTRAINT "ais_ais_sync_mutations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "ais_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ais_sync_mutations" ADD CONSTRAINT "ais_ais_sync_mutations_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "ais_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ais_number_blocks" ADD CONSTRAINT "ais_ais_number_blocks_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "ais_devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
