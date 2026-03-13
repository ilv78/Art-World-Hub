ALTER TABLE "users" ADD COLUMN "role" varchar DEFAULT 'user' NOT NULL;
--> statement-breakpoint
UPDATE "users" SET "role" = 'admin' WHERE "email" = 'liviu.iusan@gmail.com';