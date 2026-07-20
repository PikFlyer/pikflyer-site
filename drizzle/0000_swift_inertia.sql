CREATE TABLE `invite_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`code_hash` text NOT NULL,
	`label` text,
	`duration_days` integer DEFAULT 180 NOT NULL,
	`max_devices` integer DEFAULT 1 NOT NULL,
	`bound_device_hash` text,
	`instance_id` text,
	`activated_at` text,
	`expires_at` text,
	`disabled_at` text,
	`created_at` text NOT NULL,
	`last_validated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invite_codes_code_hash_unique` ON `invite_codes` (`code_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `invite_codes_instance_id_unique` ON `invite_codes` (`instance_id`);