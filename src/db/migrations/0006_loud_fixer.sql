ALTER TABLE `profile` ADD `remind_bills` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `profile` ADD `remind_payday` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `profile` ADD `remind_low_budget` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `profile` ADD `remind_evening` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `recurring_bills` ADD `remind` integer DEFAULT true NOT NULL;