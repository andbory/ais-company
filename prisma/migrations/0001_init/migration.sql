-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "invoiceNumber" VARCHAR(64) NOT NULL,
    "invoiceType" VARCHAR(100) NOT NULL,
    "customerName" VARCHAR(200) NOT NULL,
    "date" DATE NOT NULL,
    "time" TIME(0) NOT NULL,
    "netTotal" DECIMAL(18,2) NOT NULL,
    "amountOwed" DECIMAL(18,2) NOT NULL,
    "totalAmount" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "productName" VARCHAR(200) NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL,
    "unitOrWeight" VARCHAR(100) NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "total" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");
CREATE INDEX "invoices_customerName_idx" ON "invoices"("customerName");
CREATE INDEX "invoices_date_idx" ON "invoices"("date");
CREATE INDEX "invoice_items_invoiceId_idx" ON "invoice_items"("invoiceId");

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
