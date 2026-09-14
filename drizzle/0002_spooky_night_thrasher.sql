CREATE TYPE "public"."confidence" AS ENUM('verified', 'reported', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('venue_site', 'state_agency', 'municipal_code', 'maps', 'direct_confirmation');--> statement-breakpoint
CREATE TYPE "public"."vendor_policy" AS ENUM('open', 'preferred', 'exclusive');--> statement-breakpoint
CREATE TYPE "public"."venue_region" AS ENUM('shoreline', 'river_valley', 'hartford', 'litchfield', 'fairfield');--> statement-breakpoint
CREATE TABLE "venue_field_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"field_name" text NOT NULL,
	"source_type" "source_type" NOT NULL,
	"source_url" text,
	"verified_at" date NOT NULL,
	"confidence" "confidence" DEFAULT 'reported' NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"town" text NOT NULL,
	"region" "venue_region" NOT NULL,
	"venue_type" text,
	"official_url" text,
	"latitude" text,
	"longitude" text,
	"capacity_seated" integer,
	"capacity_standing" integer,
	"capacity_ceremony" integer,
	"capacity_reception" integer,
	"capacity_by_room" jsonb,
	"indoor" boolean,
	"outdoor" boolean,
	"tented_allowed" boolean,
	"tent_restrictions" text,
	"parking_spaces" integer,
	"parking_notes" text,
	"valet_available" boolean,
	"shuttle_staging_notes" text,
	"load_in_notes" text,
	"load_in_earliest_time" text,
	"drop_off_notes" text,
	"curfew_time" text,
	"curfew_source" text,
	"amplified_music_cutoff" text,
	"noise_ordinance_reference" text,
	"vendor_policy" "vendor_policy",
	"preferred_vendor_required" boolean,
	"in_house_catering" boolean,
	"outside_catering_allowed" boolean,
	"bar_policy" text,
	"nearest_hotels" jsonb,
	"hotel_block_notes" text,
	"drive_times" jsonb,
	"accessibility_notes" text,
	"step_free_access" boolean,
	"accessible_restrooms" boolean,
	"seasonal_availability_notes" text,
	"peak_season_months" jsonb,
	"off_season_months" jsonb,
	"narrative" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "venue_field_sources" ADD CONSTRAINT "venue_field_sources_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "venue_field_sources_field_key" ON "venue_field_sources" USING btree ("venue_id","field_name");--> statement-breakpoint
CREATE INDEX "venue_field_sources_venue_idx" ON "venue_field_sources" USING btree ("venue_id");--> statement-breakpoint
CREATE UNIQUE INDEX "venues_slug_key" ON "venues" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "venues_region_idx" ON "venues" USING btree ("region");--> statement-breakpoint
CREATE INDEX "venues_town_idx" ON "venues" USING btree ("town");