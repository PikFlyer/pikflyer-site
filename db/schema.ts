import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const inviteCodes = sqliteTable("invite_codes", {
  id: text("id").primaryKey(),
  codeHash: text("code_hash").notNull().unique(),
  label: text("label"),
  durationDays: integer("duration_days").notNull().default(180),
  maxDevices: integer("max_devices").notNull().default(1),
  boundDeviceHash: text("bound_device_hash"),
  instanceId: text("instance_id").unique(),
  activatedAt: text("activated_at"),
  expiresAt: text("expires_at"),
  disabledAt: text("disabled_at"),
  createdAt: text("created_at").notNull(),
  lastValidatedAt: text("last_validated_at"),
});

export const trialDevices = sqliteTable("trial_devices", {
  deviceHash: text("device_hash").primaryKey(),
  trialStartedAt: text("trial_started_at").notNull(),
  trialExpiresAt: text("trial_expires_at").notNull(),
  createdAt: text("created_at").notNull(),
  lastSeenAt: text("last_seen_at").notNull(),
});

export const trialUsage = sqliteTable(
  "trial_usage",
  {
    deviceHash: text("device_hash").notNull(),
    usageDate: text("usage_date").notNull(),
    feature: text("feature").notNull(),
    used: integer("used").notNull().default(0),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.deviceHash, table.usageDate, table.feature] })],
);
