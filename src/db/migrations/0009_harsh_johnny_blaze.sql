CREATE TABLE `jar_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`jar_id` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`date` text NOT NULL,
	FOREIGN KEY (`jar_id`) REFERENCES `jars`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `jar_entries_jar_idx` ON `jar_entries` (`jar_id`);--> statement-breakpoint
CREATE TABLE `jars` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`name` text NOT NULL,
	`tone` text NOT NULL,
	`goal_minor` integer NOT NULL,
	`monthly_minor` integer NOT NULL,
	`currency` text NOT NULL,
	`start_date` text NOT NULL,
	`closed_at` text,
	CONSTRAINT "jars_goal_positive" CHECK("jars"."goal_minor" > 0),
	CONSTRAINT "jars_monthly_positive" CHECK("jars"."monthly_minor" > 0)
);
