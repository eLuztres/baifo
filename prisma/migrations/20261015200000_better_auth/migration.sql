-- Move from Auth.js (next-auth) tables to Better Auth tables without losing users,
-- Google links or passwords. Old sessions are dropped: everyone signs in once more.

-- User: emailVerified becomes a flag; NO_NAME placeholders get the email's name part.
ALTER TABLE "User" ADD COLUMN "emailVerifiedFlag" BOOLEAN NOT NULL DEFAULT false;
UPDATE "User" SET "emailVerifiedFlag" = ("emailVerified" IS NOT NULL);
ALTER TABLE "User" DROP COLUMN "emailVerified";
ALTER TABLE "User" RENAME COLUMN "emailVerifiedFlag" TO "emailVerified";
UPDATE "User" SET "name" = split_part("email", '@', 1) WHERE "name" = 'NO_NAME';
ALTER TABLE "User" ALTER COLUMN "name" DROP DEFAULT;

-- Account: keep the old rows aside, create the new table, copy them over.
ALTER TABLE "Account" RENAME TO "AuthJsAccount";
ALTER TABLE "AuthJsAccount" RENAME CONSTRAINT "Account_pkey" TO "AuthJsAccount_pkey";
ALTER TABLE "AuthJsAccount" RENAME CONSTRAINT "Account_userId_fkey" TO "AuthJsAccount_userId_fkey";

CREATE TABLE "Account" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Account" ("accountId", "providerId", "userId", "accessToken", "refreshToken", "idToken",
                       "accessTokenExpiresAt", "scope", "createdAt", "updatedAt")
SELECT "providerAccountId", "provider", "userId", "access_token", "refresh_token", "id_token",
       CASE WHEN "expires_at" IS NULL THEN NULL ELSE to_timestamp("expires_at") END, "scope", "createdAt", "updatedAt"
FROM "AuthJsAccount";

-- Email/password users: Better Auth keeps the hash on a "credential" account (accountId = user id).
INSERT INTO "Account" ("accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
SELECT "id"::text, 'credential', "id", "password", "createdAt", CURRENT_TIMESTAMP
FROM "User" WHERE "password" IS NOT NULL;

DROP TABLE "AuthJsAccount";
ALTER TABLE "User" DROP COLUMN "password";

-- Session: Auth.js sessions can't be carried over.
DROP TABLE "Session";
CREATE TABLE "Session" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- Verification replaces VerificationToken (unused so far).
DROP TABLE "VerificationToken";
CREATE TABLE "Verification" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Account_providerId_accountId_key" ON "Account"("providerId", "accountId");
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
