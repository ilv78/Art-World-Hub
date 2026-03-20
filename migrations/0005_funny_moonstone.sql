CREATE TABLE "site_settings" (
	"id" varchar PRIMARY KEY DEFAULT 'default' NOT NULL,
	"gallery_template" varchar DEFAULT 'contemporary' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "curator_galleries" ADD COLUMN "gallery_template" varchar DEFAULT 'contemporary';