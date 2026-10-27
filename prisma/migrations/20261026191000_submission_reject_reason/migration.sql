-- Rejecting on WhatsApp asks the admin for a reason, which the seller then gets.
ALTER TABLE "Submission" ADD COLUMN "rejectAskedAt" TIMESTAMP(6),
ADD COLUMN "rejectReason" TEXT;
