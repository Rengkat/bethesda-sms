/*
  Warnings:

  - A unique constraint covering the columns `[staffId,deviceId,timestamp,type]` on the table `Attendance` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "VisitorCategory" AS ENUM ('GENERAL', 'PARENT_GUARDIAN', 'VENDOR_SUPPLIER', 'GOVERNMENT_OFFICIAL', 'DONOR_PARTNER', 'VOLUNTEER_PROSPECT', 'OTHER');

-- CreateEnum
CREATE TYPE "DonorType" AS ENUM ('INDIVIDUAL', 'ORGANIZATION', 'CHURCH_FAITH_BASED', 'GOVERNMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "DonationType" AS ENUM ('CASH', 'BANK_TRANSFER', 'CHEQUE', 'IN_KIND');

-- CreateEnum
CREATE TYPE "QueryCategory" AS ENUM ('LATENESS', 'ABSENTEEISM', 'MISCONDUCT', 'POLICY_VIOLATION', 'PERFORMANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "QueryStatus" AS ENUM ('PENDING_RESPONSE', 'RESPONDED', 'RESOLVED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'FINALIZED', 'PAID');

-- AlterEnum
ALTER TYPE "AttendanceSource" ADD VALUE 'WEB_SELF';

-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "currentSalary" DECIMAL(12,2);

-- CreateTable
CREATE TABLE "Visitor" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "organization" TEXT,
    "category" "VisitorCategory" NOT NULL DEFAULT 'GENERAL',
    "purposeOfVisit" TEXT NOT NULL,
    "personToSee" TEXT NOT NULL,
    "badgeNumber" TEXT,
    "timeIn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timeOut" TIMESTAMP(3),
    "registeredBy" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voided" BOOLEAN NOT NULL DEFAULT false,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" TEXT,
    "voidReason" TEXT,

    CONSTRAINT "Visitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Donation" (
    "id" TEXT NOT NULL,
    "donorName" TEXT NOT NULL,
    "donorType" "DonorType" NOT NULL DEFAULT 'INDIVIDUAL',
    "donorContact" TEXT,
    "donationType" "DonationType" NOT NULL,
    "amount" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "inKindDescription" TEXT,
    "purpose" TEXT,
    "receiptNumber" TEXT,
    "donatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedBy" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visitorId" TEXT,
    "voided" BOOLEAN NOT NULL DEFAULT false,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" TEXT,
    "voidReason" TEXT,

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffQuery" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "issuedById" TEXT NOT NULL,
    "category" "QueryCategory" NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dateIssued" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responseDeadline" TIMESTAMP(3),
    "staffResponse" TEXT,
    "respondedAt" TIMESTAMP(3),
    "status" "QueryStatus" NOT NULL DEFAULT 'PENDING_RESPONSE',
    "deductionAmount" DECIMAL(12,2),
    "payslipId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffQuery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffDeduction" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "issuedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "dateIssued" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payslipId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffDeduction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollPeriod" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "generatedBy" TEXT NOT NULL,
    "finalizedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payslip" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "baseSalary" DECIMAL(12,2) NOT NULL,
    "lateCount" INTEGER NOT NULL DEFAULT 0,
    "absenceCount" INTEGER NOT NULL DEFAULT 0,
    "queryDeductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "queryDeductionNote" TEXT,
    "otherDeductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "otherDeductionNote" TEXT,
    "netPay" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payslip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Visitor_timeIn_idx" ON "Visitor"("timeIn");

-- CreateIndex
CREATE INDEX "Visitor_category_idx" ON "Visitor"("category");

-- CreateIndex
CREATE INDEX "Visitor_voided_idx" ON "Visitor"("voided");

-- CreateIndex
CREATE INDEX "Donation_donatedAt_idx" ON "Donation"("donatedAt");

-- CreateIndex
CREATE INDEX "Donation_donorType_idx" ON "Donation"("donorType");

-- CreateIndex
CREATE INDEX "Donation_voided_idx" ON "Donation"("voided");

-- CreateIndex
CREATE INDEX "Donation_visitorId_idx" ON "Donation"("visitorId");

-- CreateIndex
CREATE INDEX "StaffQuery_staffId_idx" ON "StaffQuery"("staffId");

-- CreateIndex
CREATE INDEX "StaffQuery_status_idx" ON "StaffQuery"("status");

-- CreateIndex
CREATE INDEX "StaffDeduction_staffId_idx" ON "StaffDeduction"("staffId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollPeriod_month_year_key" ON "PayrollPeriod"("month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Payslip_periodId_staffId_key" ON "Payslip"("periodId", "staffId");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_staffId_deviceId_timestamp_type_key" ON "Attendance"("staffId", "deviceId", "timestamp", "type");

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "Visitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffQuery" ADD CONSTRAINT "StaffQuery_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffQuery" ADD CONSTRAINT "StaffQuery_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffQuery" ADD CONSTRAINT "StaffQuery_payslipId_fkey" FOREIGN KEY ("payslipId") REFERENCES "Payslip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffDeduction" ADD CONSTRAINT "StaffDeduction_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffDeduction" ADD CONSTRAINT "StaffDeduction_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffDeduction" ADD CONSTRAINT "StaffDeduction_payslipId_fkey" FOREIGN KEY ("payslipId") REFERENCES "Payslip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "PayrollPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
