CREATE TYPE "public"."draft_status" AS ENUM('active', 'converted', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."funnel_action" AS ENUM('enter', 'exit', 'submit', 'error');--> statement-breakpoint
CREATE TYPE "public"."scope_tier" AS ENUM('full_planning', 'partial_planning', 'day_of_coordination');--> statement-breakpoint
CREATE TABLE "funnel_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"draft_id" uuid NOT NULL,
	"step" integer NOT NULL,
	"action" "funnel_action" NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_hash" text
);
--> statement-breakpoint
CREATE TABLE "inquiry_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"status" "draft_status" DEFAULT 'active' NOT NULL,
	"event_type" "event_type",
	"event_date" date,
	"event_date_flexible" boolean DEFAULT false NOT NULL,
	"guest_count_min" integer,
	"guest_count_max" integer,
	"venue_status" "venue_status",
	"venue_name" text,
	"event_town" text,
	"scope_tier" "scope_tier",
	"budget_band" text,
	"services_needed" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"furthest_step" integer DEFAULT 1 NOT NULL,
	"converted_inquiry_id" uuid,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "scope_tier" "scope_tier";--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "draft_id" uuid;--> statement-breakpoint
ALTER TABLE "funnel_events" ADD CONSTRAINT "funnel_events_draft_id_inquiry_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."inquiry_drafts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_drafts" ADD CONSTRAINT "inquiry_drafts_converted_inquiry_id_inquiries_id_fk" FOREIGN KEY ("converted_inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "funnel_events_draft_idx" ON "funnel_events" USING btree ("draft_id");--> statement-breakpoint
CREATE INDEX "funnel_events_step_idx" ON "funnel_events" USING btree ("step","action");--> statement-breakpoint
CREATE INDEX "funnel_events_occurred_idx" ON "funnel_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "inquiry_drafts_token_hash_key" ON "inquiry_drafts" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "inquiry_drafts_status_idx" ON "inquiry_drafts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "inquiry_drafts_updated_at_idx" ON "inquiry_drafts" USING btree ("updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "inquiries_draft_id_key" ON "inquiries" USING btree ("draft_id");