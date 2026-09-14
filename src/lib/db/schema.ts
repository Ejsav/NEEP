/**
 * Database schema.
 *
 * Design notes that matter:
 *  - Attribution lives in its own table. It is 1:1 with an inquiry today, but it
 *    is the column set most likely to grow, and it keeps PII-adjacent marketing
 *    data separable from the contact record.
 *  - IP addresses are never stored raw. We store a keyed HMAC so abuse can be
 *    correlated without retaining a network identifier. See docs/SECURITY.md.
 *  - Every inquiry carries an explicit response_due_at. The response commitment
 *    is a system with a due date, not a slogan on a page.
 */
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ enums */

export const eventTypeEnum = pgEnum("event_type", [
  "wedding",
  "corporate",
  "private",
  "coordination",
]);

export const inquiryStatusEnum = pgEnum("inquiry_status", [
  "new",
  "in_progress",
  "quoted",
  "won",
  "lost",
  "spam",
]);

export const venueStatusEnum = pgEnum("venue_status", [
  "booked",
  "shortlisted",
  "not_started",
  "need_help",
]);

export const contactPreferenceEnum = pgEnum("contact_preference", [
  "email",
  "phone",
  "either",
]);

export const notificationStatusEnum = pgEnum("notification_status", [
  "pending",
  "sent",
  "failed",
  "no_provider",
]);

export const adminRoleEnum = pgEnum("admin_role", ["owner", "staff"]);

/**
 * How much of the event we are asked to run. This is the deal-size lever, and
 * it is a separate question from which individual services are wanted - a
 * customer can want full planning with no transportation, or day-of
 * coordination with every add-on.
 */
export const scopeTierEnum = pgEnum("scope_tier", [
  "full_planning",
  "partial_planning",
  "day_of_coordination",
]);

/**
 * Draft lifecycle. Deliberately NOT folded into inquiry_status: a draft is not
 * a lead, and admin queries that count real leads must never accidentally
 * include an abandoned funnel.
 */
export const draftStatusEnum = pgEnum("draft_status", [
  "active",
  "converted",
  "abandoned",
]);

export const venueRegionEnum = pgEnum("venue_region", [
  "shoreline",
  "river_valley",
  "hartford",
  "litchfield",
  "fairfield",
]);

export const vendorPolicyEnum = pgEnum("vendor_policy", [
  "open",
  "preferred",
  "exclusive",
]);

/**
 * Where a fact came from, in the order we trust them. A competitor's page, a
 * forum post, and an inference from a photograph are deliberately absent -
 * those are not sources. See docs/VENUE_DATABASE.md.
 */
export const sourceTypeEnum = pgEnum("source_type", [
  "venue_site",
  "state_agency",
  "municipal_code",
  "maps",
  "direct_confirmation",
]);

export const confidenceEnum = pgEnum("confidence", [
  "verified",
  "reported",
  "unknown",
]);

export const funnelActionEnum = pgEnum("funnel_action", [
  "enter",
  "exit",
  "submit",
  "error",
]);

/* -------------------------------------------------------------- inquiries */

export const inquiries = pgTable(
  "inquiries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Short human-readable handle, safe to read aloud on the phone. */
    reference: text("reference").notNull(),

    status: inquiryStatusEnum("status").notNull().default("new"),
    eventType: eventTypeEnum("event_type").notNull(),

    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    contactPreference: contactPreferenceEnum("contact_preference")
      .notNull()
      .default("either"),

    eventDate: date("event_date"),
    eventDateFlexible: boolean("event_date_flexible").notNull().default(false),
    guestCountMin: integer("guest_count_min"),
    guestCountMax: integer("guest_count_max"),

    venueStatus: venueStatusEnum("venue_status"),
    venueName: text("venue_name"),
    eventTown: text("event_town"),
    /** Budget band key, resolved against a server-side table of ranges. */
    budgetBand: text("budget_band"),
    /** Selected service keys. Validated server-side against a known list. */
    servicesNeeded: jsonb("services_needed").$type<string[]>().notNull().default([]),
    /**
     * How much of the event we run. A separate question from which modules are
     * wanted: a customer can want full planning with no transportation, or
     * day-of coordination with every module. This is the deal-size lever.
     */
    scopeTier: scopeTierEnum("scope_tier"),
    message: text("message"),

    /**
     * The draft this inquiry was completed from, when there was one. Uniquely
     * indexed, so "exactly one inquiry per draft" is a database guarantee
     * rather than a convention the application is trusted to keep. Null is
     * normal: a submission with no draft cookie (cleared, or the no-JS path)
     * still saves the lead, it just loses the funnel linkage.
     */
    draftId: uuid("draft_id"),

    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Response commitment deadline. Drives the overdue flag in admin. */
    responseDueAt: timestamp("response_due_at", { withTimezone: true }).notNull(),
    firstResponseAt: timestamp("first_response_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("inquiries_reference_key").on(t.reference),
    uniqueIndex("inquiries_draft_id_key").on(t.draftId),
    index("inquiries_submitted_at_idx").on(t.submittedAt),
    index("inquiries_status_idx").on(t.status),
    index("inquiries_response_due_idx").on(t.responseDueAt),
    index("inquiries_email_idx").on(t.email),
  ],
);

/* ------------------------------------------------------------ attribution */

export const inquiryAttribution = pgTable("inquiry_attribution", {
  inquiryId: uuid("inquiry_id")
    .primaryKey()
    .references(() => inquiries.id, { onDelete: "cascade" }),

  /** First touch: set once on the visitor's first request, never overwritten. */
  firstTouchAt: timestamp("first_touch_at", { withTimezone: true }),
  firstLandingPath: text("first_landing_path"),
  firstReferrer: text("first_referrer"),
  firstReferrerHost: text("first_referrer_host"),
  firstUtmSource: text("first_utm_source"),
  firstUtmMedium: text("first_utm_medium"),
  firstUtmCampaign: text("first_utm_campaign"),
  firstUtmTerm: text("first_utm_term"),
  firstUtmContent: text("first_utm_content"),
  firstClickId: text("first_click_id"),
  firstClickIdSource: text("first_click_id_source"),

  /** Last touch: overwritten whenever a new campaign or external referrer appears. */
  lastTouchAt: timestamp("last_touch_at", { withTimezone: true }),
  lastLandingPath: text("last_landing_path"),
  lastReferrer: text("last_referrer"),
  lastReferrerHost: text("last_referrer_host"),
  lastUtmSource: text("last_utm_source"),
  lastUtmMedium: text("last_utm_medium"),
  lastUtmCampaign: text("last_utm_campaign"),
  lastUtmTerm: text("last_utm_term"),
  lastUtmContent: text("last_utm_content"),
  lastClickId: text("last_click_id"),
  lastClickIdSource: text("last_click_id_source"),

  /** Opaque per-visit id. Not linked to any third party. */
  sessionId: text("session_id"),
  /** Number of distinct visits recorded before submitting. */
  touchCount: integer("touch_count").notNull().default(1),
  /** The page the form was actually submitted from. */
  submittedFromPath: text("submitted_from_path"),

  userAgent: text("user_agent"),
  /** Keyed HMAC of the client IP. Never the raw address. */
  ipHash: text("ip_hash"),
});

/* ----------------------------------------------------------- notifications */

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inquiryId: uuid("inquiry_id").references(() => inquiries.id, {
      onDelete: "cascade",
    }),
    channel: text("channel").notNull().default("email"),
    /** Which driver handled it: "resend" when configured, "log" otherwise. */
    driver: text("driver").notNull(),
    recipient: text("recipient").notNull(),
    subject: text("subject").notNull(),
    bodyText: text("body_text").notNull(),
    status: notificationStatusEnum("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    providerMessageId: text("provider_message_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (t) => [
    index("notifications_inquiry_idx").on(t.inquiryId),
    index("notifications_status_idx").on(t.status),
  ],
);

/* ------------------------------------------------------------------- admin */

export const adminUsers = pgTable(
  "admin_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Stored lowercased. Uniqueness is enforced on the lowercased value. */
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    role: adminRoleEnum("role").notNull().default("staff"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("admin_users_email_key").on(t.email)],
);

export const adminSessions = pgTable(
  "admin_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** SHA-256 of the session token. The raw token exists only in the cookie. */
    tokenHash: text("token_hash").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Hard ceiling. A session dies here regardless of activity. */
    absoluteExpiresAt: timestamp("absolute_expires_at", {
      withTimezone: true,
    }).notNull(),
    /** Rolling idle window, pushed forward on each authenticated request. */
    idleExpiresAt: timestamp("idle_expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
  },
  (t) => [
    uniqueIndex("admin_sessions_token_hash_key").on(t.tokenHash),
    index("admin_sessions_user_idx").on(t.userId),
  ],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id").references(() => adminUsers.id, {
      onDelete: "set null",
    }),
    /** Preserved even if the user row is deleted. */
    actorLabel: text("actor_label").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ipHash: text("ip_hash"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("audit_log_created_at_idx").on(t.createdAt),
    index("audit_log_actor_idx").on(t.actorUserId),
  ],
);

/* ----------------------------------------------------------------- drafts */

/**
 * Partial planner responses, written on every step transition.
 *
 * CARRIES NO PII, BY DESIGN. Name, email and phone are asked for on the last
 * step and written only when the customer actually submits. Storing contact
 * details somebody typed but never sent is a consent problem we decline to
 * create, and it keeps the privacy policy short and true. An abandoned funnel
 * is aggregate intelligence about where the flow loses people - which is what
 * the drop-off report needs - not a person to go and contact.
 *
 * Identified by a random token held in an httpOnly cookie; only its HMAC is
 * stored here, the same discipline applied to session tokens and IP addresses.
 */
export const inquiryDrafts = pgTable(
  "inquiry_drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** HMAC of the draft cookie token. The raw token is never stored. */
    tokenHash: text("token_hash").notNull(),
    status: draftStatusEnum("status").notNull().default("active"),

    eventType: eventTypeEnum("event_type"),
    eventDate: date("event_date"),
    eventDateFlexible: boolean("event_date_flexible").notNull().default(false),
    guestCountMin: integer("guest_count_min"),
    guestCountMax: integer("guest_count_max"),
    venueStatus: venueStatusEnum("venue_status"),
    venueName: text("venue_name"),
    eventTown: text("event_town"),
    scopeTier: scopeTierEnum("scope_tier"),
    budgetBand: text("budget_band"),
    servicesNeeded: jsonb("services_needed").$type<string[]>().notNull().default([]),

    /** Highest step reached. The single most useful number on this table. */
    furthestStep: integer("furthest_step").notNull().default(1),

    convertedInquiryId: uuid("converted_inquiry_id").references(
      () => inquiries.id,
      { onDelete: "set null" },
    ),

    ipHash: text("ip_hash"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("inquiry_drafts_token_hash_key").on(t.tokenHash),
    index("inquiry_drafts_status_idx").on(t.status),
    index("inquiry_drafts_updated_at_idx").on(t.updatedAt),
  ],
);

/* ---------------------------------------------------------- funnel events */

/**
 * Step-level telemetry. Drop-off by step is the metric that matters most for
 * the planner, and it is one GROUP BY away from here.
 *
 * Keyed to the draft, never to a person: no PII, and the IP is a keyed HMAC.
 */
export const funnelEvents = pgTable(
  "funnel_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    draftId: uuid("draft_id")
      .notNull()
      .references(() => inquiryDrafts.id, { onDelete: "cascade" }),
    step: integer("step").notNull(),
    action: funnelActionEnum("action").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ipHash: text("ip_hash"),
  },
  (t) => [
    index("funnel_events_draft_idx").on(t.draftId),
    index("funnel_events_step_idx").on(t.step, t.action),
    index("funnel_events_occurred_idx").on(t.occurredAt),
  ],
);

/* ------------------------------------------------------------------ venues */

/**
 * The Connecticut venue database.
 *
 * EVERY FIELD IS NULLABLE, AND THAT IS THE DESIGN. A field without a source in
 * venue_field_sources is not a field, it is a guess, and it renders as "not
 * confirmed" rather than as a number. An incomplete honest record beats a
 * complete fabricated one - that is the entire point of this table.
 *
 * Nothing here publishes until it clears the gate in lib/venues/gate.ts.
 */
export const venues = pgTable(
  "venues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    town: text("town").notNull(),
    region: venueRegionEnum("region").notNull(),
    venueType: text("venue_type"),
    officialUrl: text("official_url"),
    latitude: text("latitude"),
    longitude: text("longitude"),

    /* Capacity, by configuration rather than a single misleading number. */
    capacitySeated: integer("capacity_seated"),
    capacityStanding: integer("capacity_standing"),
    capacityCeremony: integer("capacity_ceremony"),
    capacityReception: integer("capacity_reception"),
    /** [{ room, configuration, count }] - the differentiator over aggregators. */
    capacityByRoom: jsonb("capacity_by_room").$type<
      { room: string; configuration: string; count: number }[]
    >(),

    /* Setting. */
    indoor: boolean("indoor"),
    outdoor: boolean("outdoor"),
    tentedAllowed: boolean("tented_allowed"),
    tentRestrictions: text("tent_restrictions"),

    /* Parking and access - the highest-value cluster. */
    parkingSpaces: integer("parking_spaces"),
    parkingNotes: text("parking_notes"),
    valetAvailable: boolean("valet_available"),
    /**
     * Describes the VENUE's logistics, never a service we offer. Allowed:
     * "staging area accommodates two 56-passenger coaches". Forbidden: anything
     * implying we run the shuttle. See CLAUDE.md.
     */
    shuttleStagingNotes: text("shuttle_staging_notes"),
    loadInNotes: text("load_in_notes"),
    loadInEarliestTime: text("load_in_earliest_time"),
    dropOffNotes: text("drop_off_notes"),

    /* Timing. The venue-policy vs municipal-ordinance distinction is the one
       customers most need and least often get. */
    curfewTime: text("curfew_time"),
    curfewSource: text("curfew_source"),
    amplifiedMusicCutoff: text("amplified_music_cutoff"),
    noiseOrdinanceReference: text("noise_ordinance_reference"),

    /* Vendors. Mandatory vs merely recommended is the question that costs money. */
    vendorPolicy: vendorPolicyEnum("vendor_policy"),
    preferredVendorRequired: boolean("preferred_vendor_required"),
    inHouseCatering: boolean("in_house_catering"),
    outsideCateringAllowed: boolean("outside_catering_allowed"),
    barPolicy: text("bar_policy"),

    /* Guest logistics. */
    nearestHotels: jsonb("nearest_hotels").$type<
      { name: string; distanceMiles: number; url?: string }[]
    >(),
    hotelBlockNotes: text("hotel_block_notes"),
    driveTimes: jsonb("drive_times").$type<Record<string, string>>(),

    /* Accessibility. */
    accessibilityNotes: text("accessibility_notes"),
    stepFreeAccess: boolean("step_free_access"),
    accessibleRestrooms: boolean("accessible_restrooms"),

    /* Seasonal. */
    seasonalAvailabilityNotes: text("seasonal_availability_notes"),
    peakSeasonMonths: jsonb("peak_season_months").$type<string[]>(),
    offSeasonMonths: jsonb("off_season_months").$type<string[]>(),

    /**
     * Our own writing about this venue: what the facts above mean in practice.
     * The gate requires real length here, because a record that is only a table
     * of numbers is a directory listing, not a page worth indexing.
     */
    narrative: text("narrative"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("venues_slug_key").on(t.slug),
    index("venues_region_idx").on(t.region),
    index("venues_town_idx").on(t.town),
  ],
);

/**
 * Provenance, one row per fact.
 *
 * These facts decay - curfews change, vendor lists change, parking gets
 * reconfigured - so verifiedAt is not optional bookkeeping. Anything older than
 * twelve months renders as "last confirmed [date]" rather than as current.
 */
export const venueFieldSources = pgTable(
  "venue_field_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    /** Column name on `venues` that this row vouches for. */
    fieldName: text("field_name").notNull(),
    sourceType: sourceTypeEnum("source_type").notNull(),
    sourceUrl: text("source_url"),
    verifiedAt: date("verified_at").notNull(),
    confidence: confidenceEnum("confidence").notNull().default("reported"),
    note: text("note"),
  },
  (t) => [
    uniqueIndex("venue_field_sources_field_key").on(t.venueId, t.fieldName),
    index("venue_field_sources_venue_idx").on(t.venueId),
  ],
);

/* ------------------------------------------------------------ rate limits */

/**
 * Fixed-window counters. Postgres-backed rather than in-memory so the limit
 * holds across serverless instances and restarts. See docs/DECISIONS.md.
 */
export const rateLimitBuckets = pgTable(
  "rate_limit_buckets",
  {
    bucketKey: text("bucket_key").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.bucketKey, t.windowStart] }),
    index("rate_limit_window_idx").on(t.windowStart),
  ],
);

export type Inquiry = typeof inquiries.$inferSelect;
export type NewInquiry = typeof inquiries.$inferInsert;
export type InquiryAttribution = typeof inquiryAttribution.$inferSelect;
export type NewInquiryAttribution = typeof inquiryAttribution.$inferInsert;
export type AdminUser = typeof adminUsers.$inferSelect;
export type NotificationRecord = typeof notifications.$inferSelect;
export type InquiryDraft = typeof inquiryDrafts.$inferSelect;
export type NewInquiryDraft = typeof inquiryDrafts.$inferInsert;
export type FunnelEvent = typeof funnelEvents.$inferSelect;
export type Venue = typeof venues.$inferSelect;
export type NewVenue = typeof venues.$inferInsert;
export type VenueFieldSource = typeof venueFieldSources.$inferSelect;
export type NewVenueFieldSource = typeof venueFieldSources.$inferInsert;
