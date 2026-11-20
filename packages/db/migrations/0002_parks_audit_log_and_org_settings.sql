CREATE TYPE "public"."park_status" AS ENUM('draft', 'connecting', 'online', 'degraded', 'offline');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"actor_user_id" text,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_settings" (
	"organization_id" text PRIMARY KEY NOT NULL,
	"park_limit" integer DEFAULT 10 NOT NULL,
	CONSTRAINT "org_settings_park_limit_range" CHECK ("org_settings"."park_limit" between 1 and 1000)
);
--> statement-breakpoint
CREATE TABLE "park" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"timezone" text NOT NULL,
	"status" "park_status" DEFAULT 'draft' NOT NULL,
	"fast_interval_s" integer DEFAULT 5 NOT NULL,
	"billing_started_at" timestamp with time zone,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "park_latitude_range" CHECK ("park"."latitude" between -90 and 90),
	CONSTRAINT "park_longitude_range" CHECK ("park"."longitude" between -180 and 180),
	CONSTRAINT "park_fast_interval_range" CHECK ("park"."fast_interval_s" between 5 and 3600)
);
--> statement-breakpoint
ALTER TABLE "org_settings" ADD CONSTRAINT "org_settings_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "park" ADD CONSTRAINT "park_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "park" ADD CONSTRAINT "park_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_organization_at_index" ON "audit_log" USING btree ("organization_id","at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "park_organization_name_unique" ON "park" USING btree ("organization_id",lower("name"));