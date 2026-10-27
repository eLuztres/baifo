-- A service's kind of offer (class, service, support), and an event's start and address.
ALTER TABLE "Product" ADD COLUMN     "address" TEXT,
ADD COLUMN     "serviceType" TEXT,
ADD COLUMN     "startsAt" TIMESTAMP(6);

ALTER TABLE "Submission" ADD COLUMN     "address" TEXT,
ADD COLUMN     "serviceType" TEXT,
ADD COLUMN     "startsAt" TIMESTAMP(6);

-- Events and workshops get their own store category, like Servicios and Busco.
INSERT INTO "Category" ("slug", "name", "text", "scene", "sortOrder", "keywords") VALUES
  ('eventos', '{"es": "Eventos y talleres", "en": "Events and workshops", "it": "Eventi e laboratori", "fr": "Événements et ateliers", "de": "Events und Workshops"}', '{}', '', 9, '{evento,taller,concierto,"clase de baile",workshop,mercadillo}')
ON CONFLICT ("slug") DO NOTHING;
