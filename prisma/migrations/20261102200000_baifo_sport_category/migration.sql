-- #436: "Deporte y movimiento" gets its own category; the sports gear keywords move to it from Ocio and Hogar.
INSERT INTO "Category" ("slug", "name", "text", "image", "keywords", "scene", "sortOrder") VALUES
  ('deporte',
   '{"es": "Deporte y movimiento", "en": "Sports and movement", "it": "Sport e movimento", "fr": "Sport et mouvement", "de": "Sport und Bewegung"}',
   '{"es": "Surf, bici, gimnasio, material deportivo y gente para moverse.", "en": "Surf, bikes, gym, sports gear and people to move with.", "it": "Surf, bici, palestra, attrezzatura sportiva e gente con cui muoversi.", "fr": "Surf, vélo, salle de sport, matériel de sport et gens avec qui bouger.", "de": "Surfen, Rad, Fitness, Sportausrüstung und Leute zum Bewegen."}',
   '/brand/categories/deporte.jpg',
   ARRAY['deporte', 'tabla de surf', 'neopreno', 'kitesurf', 'windsurf', 'wingfoil', 'paddle surf', 'bodyboard', 'skate', 'bicicleta', 'bici de montaña', 'pesas', 'mancuernas', 'gimnasio', 'correr', 'running', 'fútbol', 'pádel', 'tenis', 'escalada', 'gente para entrenar'],
   '', 6)
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name", "text" = EXCLUDED."text", "image" = EXCLUDED."image", "keywords" = EXCLUDED."keywords",
  "scene" = EXCLUDED."scene", "sortOrder" = EXCLUDED."sortOrder", "parentId" = NULL;

UPDATE "Category" SET
  "keywords" = ARRAY['buceo', 'pesca', 'senderismo', 'excursión', 'camping', 'quedada', 'gente para planes', 'fiesta', 'cine', 'mercadillo', 'feria', 'estrellas'],
  "text" = '{"es": "Actividades, excursiones, naturaleza y planes.", "en": "Activities, trips, nature and plans.", "it": "Attività, escursioni, natura e programmi.", "fr": "Activités, excursions, nature et sorties.", "de": "Aktivitäten, Ausflüge, Natur und Unternehmungen."}'
WHERE "slug" = 'ocio';

UPDATE "Category" SET "keywords" = array_remove("keywords", 'bicicleta') WHERE "slug" = 'hogar';
