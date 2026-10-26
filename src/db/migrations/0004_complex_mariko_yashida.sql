PRAGMA foreign_keys=OFF;--> statement-breakpoint
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
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "recurring_bills_day" CHECK("__new_recurring_bills"."day" BETWEEN 1 AND 31),
	CONSTRAINT "recurring_bills_amount_positive" CHECK("__new_recurring_bills"."amount_minor" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_recurring_bills`("id", "created_at", "updated_at", "name", "amount_minor", "currency", "day", "category_id", "active") SELECT "id", "created_at", "updated_at", "name", "amount_minor", "currency", "day", "category_id", "active" FROM `recurring_bills`;--> statement-breakpoint
DROP TABLE `recurring_bills`;--> statement-breakpoint
ALTER TABLE `__new_recurring_bills` RENAME TO `recurring_bills`;--> statement-breakpoint
PRAGMA foreign_keys=ON;