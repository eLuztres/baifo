-- More ways to contact the person behind a listing.
ALTER TABLE "Submission" ADD COLUMN "contactEmail" TEXT,
ADD COLUMN "contactWeb" TEXT,
ADD COLUMN "contactInstagram" TEXT;
