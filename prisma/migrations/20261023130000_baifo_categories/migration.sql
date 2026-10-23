-- Baifo's store categories for second-hand items; "otros" catches whatever fits nowhere else.
INSERT INTO "Category" ("slug", "name", "text", "scene", "sortOrder") VALUES
  ('casa', '{"es": "Casa y muebles", "en": "Home and furniture"}', '{}', '', 0),
  ('moda', '{"es": "Ropa y moda", "en": "Clothes and fashion"}', '{}', '', 1),
  ('electronica', '{"es": "Electrónica", "en": "Electronics"}', '{}', '', 2),
  ('deporte', '{"es": "Deporte y surf", "en": "Sport and surf"}', '{}', '', 3),
  ('ninos', '{"es": "Niños y bebés", "en": "Kids and babies"}', '{}', '', 4),
  ('jardin', '{"es": "Jardín y bricolaje", "en": "Garden and DIY"}', '{}', '', 5),
  ('motor', '{"es": "Bicis y motor", "en": "Bikes and vehicles"}', '{}', '', 6),
  ('otros', '{"es": "Otros", "en": "Other"}', '{}', '', 7)
ON CONFLICT ("slug") DO NOTHING;
