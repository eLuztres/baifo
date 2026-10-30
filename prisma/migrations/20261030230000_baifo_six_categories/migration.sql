-- #381: Baifo has six categories now. The title shows in the ring; the text is a description that isn't shown.
INSERT INTO "Category" ("slug", "name", "text", "image", "keywords", "scene", "sortOrder") VALUES
  ('cultura',
   '{"es": "Cultura y creatividad", "en": "Culture and creativity", "it": "Cultura e creatività", "fr": "Culture et créativité", "de": "Kultur und Kreativität"}',
   '{"es": "Música, instrumentos, discos, libros, arte y conciertos.", "en": "Music, instruments, records, books, art and concerts.", "it": "Musica, strumenti, dischi, libri, arte e concerti.", "fr": "Musique, instruments, disques, livres, art et concerts.", "de": "Musik, Instrumente, Platten, Bücher, Kunst und Konzerte."}',
   '/brand/categories/cultura.jpg',
   ARRAY['música', 'guitarra', 'ukelele', 'timple', 'bajo', 'teclado', 'piano', 'batería', 'amplificador', 'micrófono', 'pedal de efectos', 'equipo de DJ', 'discos', 'vinilos', 'libros', 'arte', 'cuadro', 'cerámica', 'artesanía', 'fotografía', 'concierto', 'exposición', 'gente para tocar'],
   '', 0),
  ('aprender',
   '{"es": "Aprender y enseñar", "en": "Learn and teach", "it": "Imparare e insegnare", "fr": "Apprendre et enseigner", "de": "Lernen und Lehren"}',
   '{"es": "Clases, idiomas, talleres y formación.", "en": "Lessons, languages, workshops and training.", "it": "Lezioni, lingue, laboratori e formazione.", "fr": "Cours, langues, ateliers et formation.", "de": "Kurse, Sprachen, Workshops und Weiterbildung."}',
   '/brand/categories/aprender.jpg',
   ARRAY['clases', 'profesor', 'profesora', 'idiomas', 'español', 'inglés', 'alemán', 'taller', 'curso', 'formación', 'clases de música', 'clases de surf', 'clases particulares', 'IA', 'informática'],
   '', 1),
  ('bienestar',
   '{"es": "Cuerpo y bienestar", "en": "Body and wellbeing", "it": "Corpo e benessere", "fr": "Corps et bien-être", "de": "Körper und Wohlbefinden"}',
   '{"es": "Cuidado personal, actividad física y bienestar.", "en": "Personal care, physical activity and wellbeing.", "it": "Cura personale, attività fisica e benessere.", "fr": "Soins personnels, activité physique et bien-être.", "de": "Körperpflege, Bewegung und Wohlbefinden."}',
   '/brand/categories/bienestar.jpg',
   ARRAY['yoga', 'masaje', 'meditación', 'pilates', 'entrenador personal', 'fisioterapia', 'peluquería', 'estética', 'cosmética natural', 'terapia', 'salud'],
   '', 2),
  ('hogar',
   '{"es": "Hogar, objetos y jardín", "en": "Home, things and garden", "it": "Casa, oggetti e giardino", "fr": "Maison, objets et jardin", "de": "Haus, Dinge und Garten"}',
   '{"es": "Muebles, artículos para casa, tecnología y jardinería.", "en": "Furniture, household items, technology and gardening.", "it": "Mobili, articoli per la casa, tecnologia e giardinaggio.", "fr": "Meubles, articles pour la maison, technologie et jardinage.", "de": "Möbel, Haushaltswaren, Technik und Gartenarbeit."}',
   '/brand/categories/hogar.jpg',
   ARRAY['muebles', 'sofá', 'mesa', 'silla', 'cama', 'lámpara', 'decoración', 'electrodomésticos', 'móvil', 'ordenador', 'cámara de fotos', 'electrónica', 'ropa', 'zapatos', 'juguetes', 'cosas de bebé', 'bicicleta', 'moto', 'coche', 'herramientas', 'plantas', 'macetas', 'jardín', 'comida casera', 'casa o habitación'],
   '', 3),
  ('ocio',
   '{"es": "Ocio, naturaleza y experiencias", "en": "Leisure, nature and experiences", "it": "Tempo libero, natura ed esperienze", "fr": "Loisirs, nature et expériences", "de": "Freizeit, Natur und Erlebnisse"}',
   '{"es": "Actividades, excursiones, deportes y planes.", "en": "Activities, trips, sports and plans.", "it": "Attività, escursioni, sport e programmi.", "fr": "Activités, excursions, sports et sorties.", "de": "Aktivitäten, Ausflüge, Sport und Unternehmungen."}',
   '/brand/categories/ocio.jpg',
   ARRAY['tabla de surf', 'neopreno', 'kitesurf', 'windsurf', 'paddle surf', 'skate', 'buceo', 'pesca', 'senderismo', 'excursión', 'camping', 'quedada', 'gente para planes', 'fiesta', 'cine', 'mercadillo', 'feria', 'estrellas'],
   '', 4),
  ('servicios',
   '{"es": "Servicios y ayuda local", "en": "Services and local help", "it": "Servizi e aiuto locale", "fr": "Services et entraide locale", "de": "Dienste und Hilfe vor Ort"}',
   '{"es": "Servicios profesionales, acompañamiento y apoyo cotidiano.", "en": "Professional services, companionship and everyday support.", "it": "Servizi professionali, compagnia e supporto quotidiano.", "fr": "Services professionnels, accompagnement et aide au quotidien.", "de": "Professionelle Dienste, Begleitung und Hilfe im Alltag."}',
   '/brand/categories/servicios.jpg',
   ARRAY['fontanero', 'electricista', 'reparación', 'limpieza', 'mudanza', 'trámites', 'gestoría', 'traducción', 'fotógrafo', 'cuidado de mascotas', 'cuidado de niños', 'acompañar a mayores', 'ayuda con el móvil', 'perdido', 'encontrado'],
   '', 5)
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name", "text" = EXCLUDED."text", "image" = EXCLUDED."image", "keywords" = EXCLUDED."keywords",
  "scene" = EXCLUDED."scene", "sceneVariants" = '{}', "sortOrder" = EXCLUDED."sortOrder", "parentId" = NULL;

-- Where each old category's listings go; one not listed here goes to Hogar.
CREATE TEMP TABLE "CategoryMove" ("fromSlug" TEXT PRIMARY KEY, "toSlug" TEXT NOT NULL);
INSERT INTO "CategoryMove" VALUES
  ('arte', 'cultura'), ('instrumentos', 'cultura'), ('musica', 'cultura'),
  ('clases', 'aprender'), ('tecnologia-ia', 'aprender'),
  ('salud-y-bienestar', 'bienestar'),
  ('casa', 'hogar'), ('moda', 'hogar'), ('electronica', 'hogar'), ('ninos', 'hogar'), ('jardin', 'hogar'),
  ('motor', 'hogar'), ('comida', 'hogar'), ('vivienda', 'hogar'),
  ('deporte', 'ocio'), ('planes', 'ocio'),
  ('ninos-y-mayores', 'servicios'), ('tramites', 'servicios'), ('mascotas', 'servicios'), ('ayuda', 'servicios'),
  ('perdido', 'servicios'), ('otros', 'servicios');

-- Listings whose old category says less than what they are (a surf class was in "Deporte", a plumber in "Casa").
CREATE TEMP TABLE "ProductMove" ("productSlug" TEXT PRIMARY KEY, "toSlug" TEXT NOT NULL);
INSERT INTO "ProductMove" VALUES
  ('vitrina-36-taller-de-ceramica-para-principiantes', 'aprender'),
  ('vitrina-20-clases-de-surf-skate', 'aprender'),
  ('vitrina-21-surf-para-principiantes-en-el-cotillo', 'aprender'),
  ('vitrina-18-clases-de-canto-y-voz', 'aprender'),
  ('vitrina-17-clases-de-guitarra-en-la-playa', 'aprender'),
  ('vitrina-19-ukelele-para-ninos', 'aprender'),
  ('vitrina-24-fotos-de-retrato-en-la-playa', 'servicios'),
  ('vitrina-25-reparacion-de-tablas-de-surf', 'servicios'),
  ('fontanero-en-corralejo-3cddb6', 'servicios'),
  ('ayuda-con-tu-movil-y-tecnologia-ed1bdc', 'servicios'),
  ('vitrina-38-feria-del-queso-majorero', 'ocio'),
  ('show-de-striptease-masculino-f1c05e', 'ocio'),
  ('live-music-abdadf', 'cultura');

CREATE TEMP TABLE "ProductTarget" AS
SELECT p."id" AS "productId", COALESCE(pm."toSlug", (
    SELECT cm."toSlug" FROM "_CategoryToProduct" cp
    JOIN "Category" c ON c."id" = cp."A"
    JOIN "CategoryMove" cm ON cm."fromSlug" = c."slug"
    WHERE cp."B" = p."id"
    ORDER BY c."parentId" IS NULL DESC, c."sortOrder"
    LIMIT 1
  ), 'hogar') AS "toSlug"
FROM "Product" p
LEFT JOIN "ProductMove" pm ON pm."productSlug" = p."slug";

-- Every listing ends up in exactly one of the six.
DELETE FROM "_CategoryToProduct";
INSERT INTO "_CategoryToProduct" ("A", "B")
SELECT c."id", t."productId" FROM "ProductTarget" t JOIN "Category" c ON c."slug" = t."toSlug";
UPDATE "Product" p SET "category" = c."name"->>'es'
FROM "ProductTarget" t JOIN "Category" c ON c."slug" = t."toSlug"
WHERE t."productId" = p."id";

-- A submission follows its listing, else its old category.
UPDATE "Submission" s SET "category" = t."toSlug" FROM "ProductTarget" t WHERE s."productId" = t."productId";
UPDATE "Submission" s SET "category" = COALESCE((SELECT cm."toSlug" FROM "CategoryMove" cm WHERE cm."fromSlug" = s."category"), 'hogar')
WHERE s."productId" IS NULL AND s."category" IS NOT NULL;

DELETE FROM "Category" WHERE "slug" NOT IN ('cultura', 'aprender', 'bienestar', 'hogar', 'ocio', 'servicios');

DROP TABLE "ProductTarget";
DROP TABLE "ProductMove";
DROP TABLE "CategoryMove";
