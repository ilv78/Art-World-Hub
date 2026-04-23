CREATE TABLE "artist_slug_history" (
	"slug" text PRIMARY KEY NOT NULL,
	"artist_id" varchar NOT NULL,
	"retired_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "artist_slug_history" ADD CONSTRAINT "artist_slug_history_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;