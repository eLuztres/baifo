-- A listing for a service (made on /admin/listings/new?kind=service) becomes a service product.
ALTER TABLE "Submission" ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'product';
