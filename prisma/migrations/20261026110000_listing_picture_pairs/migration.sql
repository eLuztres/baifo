-- Listings made before aiImages existed: each picture in use that isn't an original is the AI picture of the original
-- at the same place, so the editor can offer original or AI for older listings too.
UPDATE "Submission" s SET "aiImages" = (
  SELECT array_agg(CASE WHEN s."images"[i] IS NOT NULL AND NOT (s."images"[i] = ANY (s."rawImages")) THEN s."images"[i] ELSE '' END ORDER BY i)
  FROM generate_subscripts(s."rawImages", 1) AS i
)
WHERE cardinality(s."aiImages") = 0 AND cardinality(s."rawImages") > 0 AND cardinality(s."images") > 0;
