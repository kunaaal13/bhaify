import { sql } from 'drizzle-orm';
import {
	pgTable,
	text,
	integer,
	boolean,
	real,
	timestamp,
	index,
	uniqueIndex
} from 'drizzle-orm/pg-core';

/**
 * Every bhaification we generate. `id` is the public short id used in /b/[id].
 *
 * Caching works on (cache_key, variant_slot): cache_key is a hash of the
 * normalised input, and variant_slot 0..2 gives three distinct takes on the
 * same input so "phir se" stays varied without re-billing the LLM. See PLAN §4.2.
 */
export const bhaifications = pgTable(
	'bhaifications',
	{
		id: text('id').primaryKey(),

		inputText: text('input_text').notNull(),
		/** Post-quirkify — this is what we display. */
		outputText: text('output_text').notNull(),
		/** Pre-quirkify, kept so we can debug persona drift separately from the quirk pass. */
		rawOutput: text('raw_output').notNull(),

		cacheKey: text('cache_key').notNull(),
		variantSlot: integer('variant_slot').notNull(),

		/** Which of the six registers the model leaned on (PLAN §2.6). */
		register: text('register'),
		/** 0..1 score emitted by quirkify, surfaced as telemetry in the UI. */
		quirkDensity: real('quirk_density'),
		/** Which provider actually served this — tells us how often the free tier runs dry. */
		model: text('model').notNull(),
		latencyMs: integer('latency_ms'),

		/** sha256(ip + APP_SALT). Never store a raw IP. */
		ipHash: text('ip_hash').notNull(),

		isPublic: boolean('is_public').notNull().default(true),
		isFlagged: boolean('is_flagged').notNull().default(false),
		flagReason: text('flag_reason'),
		viewCount: integer('view_count').notNull().default(0),

		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		uniqueIndex('bhaifications_cache_variant_idx').on(t.cacheKey, t.variantSlot),
		// Gallery feed: only rows it can actually show.
		index('bhaifications_public_recent_idx')
			.on(t.createdAt.desc())
			.where(sql`${t.isPublic} and not ${t.isFlagged}`),
		// Rate-limit lookups.
		index('bhaifications_ip_time_idx').on(t.ipHash, t.createdAt)
	]
);

export type RequestOutcome = 'ok' | 'rate_limited' | 'blocked' | 'error';

/**
 * Every inbound request including rejected ones. Rate limiting counts rows here,
 * not in `bhaifications` — a blocked or rate-limited request never produces a
 * bhaification, so counting those alone would let a rejected caller retry freely.
 */
export const requestLog = pgTable(
	'request_log',
	{
		id: text('id').primaryKey(),
		ipHash: text('ip_hash').notNull(),
		outcome: text('outcome').$type<RequestOutcome>().notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('request_log_ip_time_idx').on(t.ipHash, t.createdAt)]
);

/** User reports against gallery entries. */
export const reports = pgTable(
	'reports',
	{
		id: text('id').primaryKey(),
		bhaificationId: text('bhaification_id')
			.notNull()
			.references(() => bhaifications.id, { onDelete: 'cascade' }),
		reason: text('reason'),
		ipHash: text('ip_hash').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('reports_bhaification_idx').on(t.bhaificationId)]
);

export type Bhaification = typeof bhaifications.$inferSelect;
export type NewBhaification = typeof bhaifications.$inferInsert;
export type Report = typeof reports.$inferSelect;
