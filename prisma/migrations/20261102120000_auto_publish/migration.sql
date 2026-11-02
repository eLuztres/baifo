-- "Publicar" as Online: the listing goes online once the AI wrote it; Oculto (false) keeps it ready, not shown.
ALTER TABLE "Submission" ADD COLUMN "autoPublish" BOOLEAN NOT NULL DEFAULT false;
