import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
