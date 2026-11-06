-- Hashtags become etiquetas: one name per language. The old ones keep their listings, as their Spanish name.
CREATE TABLE "Tag" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "names" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "_SubmissionToTag" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_SubmissionToTag_AB_pkey" PRIMARY KEY ("A","B")
);

CREATE INDEX "_SubmissionToTag_B_index" ON "_SubmissionToTag"("B");

ALTER TABLE "_SubmissionToTag" ADD CONSTRAINT "_SubmissionToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_SubmissionToTag" ADD CONSTRAINT "_SubmissionToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Tag" ("id", "names", "createdAt")
SELECT "id", jsonb_build_object('es', upper(left("name", 1)) || substr("name", 2)), "createdAt" FROM "Hashtag";

INSERT INTO "_SubmissionToTag" ("A", "B") SELECT "B", "A" FROM "_HashtagToSubmission";

DROP TABLE "_HashtagToSubmission";

DROP TABLE "Hashtag";
