import { sql } from "drizzle-orm";
import { boolean, index, jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

// Role-based access control
export const USER_ROLES = ["user", "curator", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

// Admin sign-off on new accounts. Existing rows are grandfathered to
// "approved" by the column default so the migration needs no backfill
// (see specs/decisions/log/2026-09-23-user-approval-workflow.md); new
// self-serve signups are inserted with "pending" explicitly, at the
// application layer, overriding that default.
export const USER_APPROVAL_STATUSES = ["pending", "approved", "rejected"] as const;
export type UserApprovalStatus = (typeof USER_APPROVAL_STATUSES)[number];

// Session storage table.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// User storage table.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  password: varchar("password"), // bcrypt hash, null for OIDC-only users
  emailVerified: boolean("email_verified").default(false),
  role: varchar("role").default("user").notNull(), // user | curator | admin
  approvalStatus: varchar("approval_status").default("approved").notNull(), // pending | approved | rejected
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Magic link tokens for email signup verification.
export const magicLinks = pgTable("magic_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type MagicLink = typeof magicLinks.$inferSelect;
