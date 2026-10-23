-- Better Auth looks emails up in lower case, but older accounts kept the email as typed.
-- Emails that only differ in case from another account stay as they are (merge those by hand).
UPDATE "User" u SET "email" = lower(u."email")
WHERE u."email" <> lower(u."email")
  AND NOT EXISTS (SELECT 1 FROM "User" o WHERE o."id" <> u."id" AND lower(o."email") = lower(u."email"));
