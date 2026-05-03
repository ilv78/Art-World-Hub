CREATE TABLE "share_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_type" varchar(32) NOT NULL,
	"item_id" varchar NOT NULL,
	"platform" varchar(16) NOT NULL,
	"user_id" varchar,
	"user_agent_class" varchar(8),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "IDX_share_events_item" ON "share_events" USING btree ("item_type","item_id");--> statement-breakpoint
CREATE INDEX "IDX_share_events_created_at" ON "share_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "IDX_share_events_platform" ON "share_events" USING btree ("platform");