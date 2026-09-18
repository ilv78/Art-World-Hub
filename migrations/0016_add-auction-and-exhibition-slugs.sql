ALTER TABLE "auctions" ADD COLUMN "slug" text DEFAULT concat('auction-', substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)) NOT NULL;--> statement-breakpoint
ALTER TABLE "curator_galleries" ADD COLUMN "slug" text DEFAULT concat('exhibition-', substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)) NOT NULL;--> statement-breakpoint
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_slug_unique" UNIQUE("slug");--> statement-breakpoint
ALTER TABLE "curator_galleries" ADD CONSTRAINT "curator_galleries_slug_unique" UNIQUE("slug");