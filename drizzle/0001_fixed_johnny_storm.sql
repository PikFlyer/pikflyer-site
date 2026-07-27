CREATE TABLE `trial_devices` (
	`device_hash` text PRIMARY KEY NOT NULL,
	`trial_started_at` text NOT NULL,
	`trial_expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	`last_seen_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `trial_usage` (
	`device_hash` text NOT NULL,
	`usage_date` text NOT NULL,
	`feature` text NOT NULL,
	`used` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`device_hash`, `usage_date`, `feature`)
);
