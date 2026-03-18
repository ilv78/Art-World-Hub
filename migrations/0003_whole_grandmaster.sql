CREATE TABLE "curator_galleries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"curator_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"gallery_layout" jsonb,
	"is_published" boolean DEFAULT false,
	"timezone" text DEFAULT 'UTC',
	"start_date" timestamp,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "curator_gallery_artworks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gallery_id" varchar NOT NULL,
	"artwork_id" varchar NOT NULL,
	"display_order" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "curator_gallery_artworks" ADD CONSTRAINT "curator_gallery_artworks_gallery_id_curator_galleries_id_fk" FOREIGN KEY ("gallery_id") REFERENCES "public"."curator_galleries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curator_gallery_artworks" ADD CONSTRAINT "curator_gallery_artworks_artwork_id_artworks_id_fk" FOREIGN KEY ("artwork_id") REFERENCES "public"."artworks"("id") ON DELETE no action ON UPDATE no action;