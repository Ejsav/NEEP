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
    message: text("message"),

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
