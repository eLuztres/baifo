-- "Busco": people looking for something. Its subcategories mirror the store's, plus wants an item category can't hold.
UPDATE "Category" SET "sortOrder" = 10 WHERE "slug" = 'otros' AND "sortOrder" = 9;
INSERT INTO "Category" ("slug", "name", "text", "scene", "sortOrder", "keywords") VALUES
  ('busco', '{"es": "Busco", "en": "Wanted", "it": "Cerco", "fr": "Recherche", "de": "Gesucht"}', '{}', '', 9, '{busco,"estoy buscando","alguien tiene","looking for",wanted,cerco,suche}')
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "Category" ("slug", "name", "text", "scene", "sortOrder", "keywords", "parentId")
SELECT sub.slug, sub.name::jsonb, '{}', '', sub.sort_order, sub.keywords::text[], parent.id
FROM "Category" parent, (VALUES
  ('busco-casa', '{"es": "Muebles y casa", "en": "Furniture and home", "it": "Mobili e casa", "fr": "Meubles et maison", "de": "Möbel und Haushalt"}', 0, '{sofá,cama,nevera,lavadora,mesa,"cosas para el piso nuevo"}'),
  ('busco-moda', '{"es": "Ropa y moda", "en": "Clothes and fashion", "it": "Abbigliamento e moda", "fr": "Vêtements et mode", "de": "Kleidung und Mode"}', 1, '{"neopreno de mi talla",disfraz,"vestido para una boda",zapatillas}'),
  ('busco-electronica', '{"es": "Electrónica", "en": "Electronics", "it": "Elettronica", "fr": "Électronique", "de": "Elektronik"}', 2, '{móvil,portátil,cargador,"cámara GoPro",consola}'),
  ('busco-deporte', '{"es": "Surf y deporte", "en": "Surf and sport", "it": "Surf e sport", "fr": "Surf et sport", "de": "Surfen und Sport"}', 3, '{"tabla de surf","vela de windsurf",kite,bodyboard,"equipo de buceo"}'),
  ('busco-ninos', '{"es": "Niños y bebés", "en": "Children and babies", "it": "Bambini e neonati", "fr": "Enfants et bébés", "de": "Kinder und Babys"}', 4, '{carrito,"silla de coche",cuna,"ropa de bebé",juguetes}'),
  ('busco-jardin', '{"es": "Jardín y herramientas", "en": "Garden and tools", "it": "Giardino e attrezzi", "fr": "Jardin et outils", "de": "Garten und Werkzeug"}', 5, '{taladro,escalera,"plantas y esquejes",palés,"herramienta prestada"}'),
  ('busco-motor', '{"es": "Bicis, motos y coches", "en": "Bikes, motorbikes and cars", "it": "Bici, moto e auto", "fr": "Vélos, motos et voitures", "de": "Fahrräder, Motorräder und Autos"}', 6, '{"furgo camper","coche barato",scooter,"bici de montaña","baca para tablas"}'),
  ('busco-instrumentos', '{"es": "Instrumentos", "en": "Instruments", "it": "Strumenti", "fr": "Instruments", "de": "Instrumente"}', 7, '{guitarra,timple,ukelele,teclado,amplificador}'),
  ('busco-vivienda', '{"es": "Casa o habitación", "en": "A place to live", "it": "Casa o stanza", "fr": "Logement ou chambre", "de": "Wohnung oder Zimmer"}', 8, '{habitación,"piso de alquiler","casa para la temporada","sitio para la furgo"}'),
  ('busco-ayuda', '{"es": "Alguien que me ayude", "en": "Someone to help", "it": "Qualcuno che aiuti", "fr": "Quelqu''un pour aider", "de": "Jemand, der hilft"}', 9, '{"busco canguro","busco jardinero","alguien que me lleve al aeropuerto","clases de español","ayuda con una mudanza"}'),
  ('busco-planes', '{"es": "Gente para planes", "en": "People to join", "it": "Compagnia per uscire", "fr": "Des gens pour sortir", "de": "Leute für Unternehmungen"}', 10, '{"compañeros de surf","alguien para hacer senderismo","músicos para una banda","intercambio de idiomas","compartir coche"}'),
  ('busco-perdido', '{"es": "Perdido y encontrado", "en": "Lost and found", "it": "Smarriti e ritrovati", "fr": "Perdu et trouvé", "de": "Verloren und gefunden"}', 11, '{"perro perdido","gato perdido","llaves perdidas","gafas olvidadas en la playa","cartera encontrada"}')
) AS sub(slug, name, sort_order, keywords)
WHERE parent."slug" = 'busco'
ON CONFLICT ("slug") DO NOTHING;
