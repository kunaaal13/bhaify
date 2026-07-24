CREATE TABLE "bhaifications" (
	"id" text PRIMARY KEY NOT NULL,
	"input_text" text NOT NULL,
	"output_text" text NOT NULL,
	"raw_output" text NOT NULL,
	"cache_key" text NOT NULL,
	"variant_slot" integer NOT NULL,
	"register" text,
	"quirk_density" real,
	"model" text NOT NULL,
	"latency_ms" integer,
	"ip_hash" text NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"is_flagged" boolean DEFAULT false NOT NULL,
	"flag_reason" text,
	"view_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" text PRIMARY KEY NOT NULL,
	"bhaification_id" text NOT NULL,
	"reason" text,
	"ip_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "request_log" (
	"id" text PRIMARY KEY NOT NULL,
	"ip_hash" text NOT NULL,
	"outcome" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_bhaification_id_bhaifications_id_fk" FOREIGN KEY ("bhaification_id") REFERENCES "public"."bhaifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bhaifications_cache_variant_idx" ON "bhaifications" USING btree ("cache_key","variant_slot");--> statement-breakpoint
CREATE INDEX "bhaifications_public_recent_idx" ON "bhaifications" USING btree ("created_at" DESC NULLS LAST) WHERE "bhaifications"."is_public" and not "bhaifications"."is_flagged";--> statement-breakpoint
CREATE INDEX "bhaifications_ip_time_idx" ON "bhaifications" USING btree ("ip_hash","created_at");--> statement-breakpoint
CREATE INDEX "reports_bhaification_idx" ON "reports" USING btree ("bhaification_id");--> statement-breakpoint
CREATE INDEX "request_log_ip_time_idx" ON "request_log" USING btree ("ip_hash","created_at");