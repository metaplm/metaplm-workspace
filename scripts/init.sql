-- MetaPLM Workspace — Initial Schema
-- Run with: psql -U metaplm -d metaplm -f init.sql
-- (Prisma migrate deploy is preferred — this is a reference)

CREATE TYPE "ActivityType"   AS ENUM ('MEETING', 'CALL', 'EMAIL', 'NOTE');
CREATE TYPE "DealStage"      AS ENUM ('LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST');
CREATE TYPE "Currency"       AS ENUM ('USD', 'EUR', 'TRY');
CREATE TYPE "InvoiceStatus"  AS ENUM ('DRAFT', 'PENDING', 'PAID', 'OVERDUE', 'CANCELLED');

CREATE TABLE "Company" (
  "id"          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name"        TEXT        NOT NULL,
  "websiteUrl"  TEXT,
  "logoUrl"     TEXT,
  "description" TEXT,
  "linkedinUrl" TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "Contact" (
  "id"          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "firstName"   TEXT        NOT NULL,
  "lastName"    TEXT        NOT NULL,
  "title"       TEXT,
  "linkedinUrl" TEXT,
  "email"       TEXT,
  "phone"       TEXT,
  "companyId"   TEXT        NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "Activity" (
  "id"             TEXT          PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "type"           "ActivityType" NOT NULL,
  "notes"          TEXT,
  "nextActionDate" TIMESTAMPTZ,
  "companyId"      TEXT REFERENCES "Company"("id") ON DELETE SET NULL,
  "contactId"      TEXT REFERENCES "Contact"("id") ON DELETE SET NULL,
  "dealId"         TEXT,
  "createdAt"      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE "Deal" (
  "id"                TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "title"             TEXT        NOT NULL,
  "amount"            FLOAT       NOT NULL DEFAULT 0,
  "currency"          "Currency"  NOT NULL DEFAULT 'EUR',
  "stage"             "DealStage" NOT NULL DEFAULT 'LEAD',
  "expectedCloseDate" TIMESTAMPTZ,
  "wonAt"             TIMESTAMPTZ,
  "notes"             TEXT,
  "companyId"         TEXT        NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE "Activity" ADD CONSTRAINT "Activity_dealId_fkey"
  FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL;

CREATE TABLE "TimeEntry" (
  "id"        TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "date"      TIMESTAMPTZ NOT NULL,
  "hours"     FLOAT       NOT NULL,
  "category"  TEXT        NOT NULL,
  "billable"  BOOLEAN     NOT NULL DEFAULT TRUE,
  "notes"     TEXT,
  "dealId"    TEXT        NOT NULL REFERENCES "Deal"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "Category" (
  "id"              TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name"            TEXT        UNIQUE NOT NULL,
  "defaultBillable" BOOLEAN     NOT NULL DEFAULT TRUE,
  "color"           TEXT        NOT NULL DEFAULT '#6366f1',
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "Invoice" (
  "id"          TEXT            PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "number"      TEXT            UNIQUE NOT NULL,
  "amount"      FLOAT           NOT NULL,
  "currency"    "Currency"      NOT NULL DEFAULT 'EUR',
  "status"      "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "dueDate"     TIMESTAMPTZ     NOT NULL,
  "issuedDate"  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  "notes"       TEXT,
  "companyId"   TEXT            NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
  "dealId"      TEXT REFERENCES "Deal"("id") ON DELETE SET NULL,
  "createdAt"   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE TABLE "InvoiceLineItem" (
  "id"          TEXT  PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "description" TEXT  NOT NULL,
  "quantity"    FLOAT NOT NULL,
  "unitPrice"   FLOAT NOT NULL,
  "amount"      FLOAT NOT NULL,
  "invoiceId"   TEXT  NOT NULL REFERENCES "Invoice"("id") ON DELETE CASCADE
);

CREATE TABLE "Expense" (
  "id"          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "description" TEXT        NOT NULL,
  "amount"      FLOAT       NOT NULL,
  "currency"    "Currency"  NOT NULL DEFAULT 'EUR',
  "date"        TIMESTAMPTZ NOT NULL,
  "tags"        TEXT[]      NOT NULL DEFAULT '{}',
  "receipt"     TEXT,
  "companyId"   TEXT REFERENCES "Company"("id") ON DELETE SET NULL,
  "dealId"      TEXT REFERENCES "Deal"("id") ON DELETE SET NULL,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default categories
INSERT INTO "Category" ("id", "name", "defaultBillable", "color") VALUES
  (gen_random_uuid()::text, 'Consulting',  TRUE,  '#c8a96e'),
  (gen_random_uuid()::text, 'Development', TRUE,  '#8b5cf6'),
  (gen_random_uuid()::text, 'R&D',         FALSE, '#3b82f6'),
  (gen_random_uuid()::text, 'Admin',       FALSE, '#6b7280'),
  (gen_random_uuid()::text, 'Sales',       FALSE, '#f59e0b'),
  (gen_random_uuid()::text, 'Support',     TRUE,  '#10b981'),
  (gen_random_uuid()::text, 'Training',    TRUE,  '#ec4899'),
  (gen_random_uuid()::text, 'Design',      TRUE,  '#f97316');
