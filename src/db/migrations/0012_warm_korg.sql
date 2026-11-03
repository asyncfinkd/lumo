CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`color` text NOT NULL,
	`sort_order` integer NOT NULL,
	`renamed` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
-- Main holds everything from before accounts (#21). Hand-written: SQLite can't
-- ADD a REFERENCES column with a default while foreign keys are on, so the four
-- tables below are rebuilt with their rows given to Main.
INSERT INTO `accounts` (`id`, `name`, `kind`, `color`, `sort_order`) VALUES ('main', 'Main', 'debit', 'latte', 0);
--> statement-breakpoint
CREATE TABLE `transfers` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`from_account_id` text NOT NULL,
	`to_account_id` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency` text NOT NULL,
	`date` text NOT NULL,
	`occurred_at` text NOT NULL,
	`note` text,
	FOREIGN KEY (`from_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "transfers_amount_positive" CHECK("transfers"."amount_minor" > 0),
	CONSTRAINT "transfers_two_accounts" CHECK("transfers"."from_account_id" <> "transfers"."to_account_id")
);
--> statement-breakpoint
CREATE INDEX `transfers_date_idx` ON `transfers` (`date`);--> statement-breakpoint
CREATE TABLE `__new_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`kind` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency` text NOT NULL,
	`category_id` text,
	`title` text NOT NULL,
	`note` text,
	`date` text NOT NULL,
	`occurred_at` text NOT NULL,
	`source` text NOT NULL,
	`recurring_id` text,
	`account_id` text DEFAULT 'main' NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "transactions_amount_positive" CHECK("__new_transactions"."amount_minor" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_transactions` (`id`, `created_at`, `updated_at`, `kind`, `amount_minor`, `currency`, `category_id`, `title`, `note`, `date`, `occurred_at`, `source`, `recurring_id`, `account_id`) SELECT `id`, `created_at`, `updated_at`, `kind`, `amount_minor`, `currency`, `category_id`, `title`, `note`, `date`, `occurred_at`, `source`, `recurring_id`, 'main' FROM `transactions`;
--> statement-breakpoint
DROP TABLE `transactions`;
--> statement-breakpoint
ALTER TABLE `__new_transactions` RENAME TO `transactions`;
--> statement-breakpoint
CREATE INDEX `transactions_date_idx` ON `transactions` (`date`);
--> statement-breakpoint
CREATE UNIQUE INDEX `transactions_recurring_date_idx` ON `transactions` (`recurring_id`,`date`);
--> statement-breakpoint
CREATE TABLE `__new_recurring_bills` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`name` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency` text NOT NULL,
	`day` integer NOT NULL,
	`category_id` text,
	`active` integer DEFAULT true NOT NULL,
	`remind` integer DEFAULT true NOT NULL,
	`account_id` text DEFAULT 'main' NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "recurring_bills_day" CHECK("__new_recurring_bills"."day" BETWEEN 1 AND 31),
	CONSTRAINT "recurring_bills_amount_positive" CHECK("__new_recurring_bills"."amount_minor" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_recurring_bills` (`id`, `created_at`, `updated_at`, `name`, `amount_minor`, `currency`, `day`, `category_id`, `active`, `remind`, `account_id`) SELECT `id`, `created_at`, `updated_at`, `name`, `amount_minor`, `currency`, `day`, `category_id`, `active`, `remind`, 'main' FROM `recurring_bills`;
--> statement-breakpoint
DROP TABLE `recurring_bills`;
--> statement-breakpoint
ALTER TABLE `__new_recurring_bills` RENAME TO `recurring_bills`;
--> statement-breakpoint
CREATE TABLE `__new_incomes` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`name` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency` text NOT NULL,
	`day` integer NOT NULL,
	`account_id` text DEFAULT 'main' NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "incomes_day" CHECK("__new_incomes"."day" BETWEEN 1 AND 31),
	CONSTRAINT "incomes_amount_positive" CHECK("__new_incomes"."amount_minor" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_incomes` (`id`, `created_at`, `updated_at`, `name`, `amount_minor`, `currency`, `day`, `account_id`) SELECT `id`, `created_at`, `updated_at`, `name`, `amount_minor`, `currency`, `day`, 'main' FROM `incomes`;
--> statement-breakpoint
DROP TABLE `incomes`;
--> statement-breakpoint
ALTER TABLE `__new_incomes` RENAME TO `incomes`;
--> statement-breakpoint
CREATE TABLE `__new_jar_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`jar_id` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`date` text NOT NULL,
	`account_id` text DEFAULT 'main' NOT NULL,
	FOREIGN KEY (`jar_id`) REFERENCES `jars`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_jar_entries` (`id`, `created_at`, `updated_at`, `jar_id`, `amount_minor`, `date`, `account_id`) SELECT `id`, `created_at`, `updated_at`, `jar_id`, `amount_minor`, `date`, 'main' FROM `jar_entries`;
--> statement-breakpoint
DROP TABLE `jar_entries`;
--> statement-breakpoint
ALTER TABLE `__new_jar_entries` RENAME TO `jar_entries`;
--> statement-breakpoint
CREATE INDEX `jar_entries_jar_idx` ON `jar_entries` (`jar_id`);
