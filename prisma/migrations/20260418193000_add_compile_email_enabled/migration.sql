-- Add user preference for compile completion emails (default off).
ALTER TABLE "User"
ADD COLUMN "compileEmailEnabled" BOOLEAN NOT NULL DEFAULT false;
