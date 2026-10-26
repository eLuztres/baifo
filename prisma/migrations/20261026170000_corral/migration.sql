-- "El Corral": each place's real meeting spot. Baifo's first one is in Corralejo, run by Chantal Montaldo at Coworkingpunto.
CREATE TABLE "Corral" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "placeId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "text" JSONB NOT NULL DEFAULT '{}',
    "hours" JSONB NOT NULL DEFAULT '{}',
    "venue" TEXT,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "hostName" TEXT,
    "hostImage" TEXT,
    "image" TEXT,
    "whatsapp" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Corral_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Corral_placeId_key" ON "Corral"("placeId");
ALTER TABLE "Corral" ADD CONSTRAINT "Corral_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Corral" ("placeId", "name", "text", "venue", "address", "lat", "lng", "hostName", "hostImage", "whatsapp", "phone", "email", "updatedAt")
SELECT "id", 'Corral de Corralejo',
  '{"es": "Aquí entregas y recoges tus cosas, te ayudamos con tus anuncios y conoces a la gente de Baifo en persona.",
    "en": "Hand over and pick up your things, get help with your listings and meet the Baifo people in person.",
    "it": "Qui consegni e ritiri le tue cose, ti aiutiamo con i tuoi annunci e conosci di persona la gente di Baifo.",
    "fr": "Ici, tu déposes et récupères tes affaires, on t’aide avec tes annonces et tu rencontres les gens de Baifo en vrai.",
    "de": "Hier gibst du deine Sachen ab und holst sie ab, bekommst Hilfe mit deinen Anzeigen und triffst die Baifo-Leute persönlich."}',
  'Coworkingpunto', 'Calle Juan Sebastián Elcano 12, 35660 Corralejo', 28.7372217, -13.8699616,
  'Chantal Montaldo', '/brand/corral/corralejo-host.jpg', '+34 641 161 957', '+34 828 049 444', 'puntoencuentroftv@gmail.com',
  CURRENT_TIMESTAMP
FROM "Place" WHERE "slug" = 'corralejo'
ON CONFLICT ("placeId") DO NOTHING;
