ALTER TABLE "artworks" ALTER COLUMN "price" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "artworks" ADD COLUMN "price_on_request" boolean DEFAULT false NOT NULL;