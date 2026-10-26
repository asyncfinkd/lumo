ALTER TABLE `profile` ADD `avatar_color` text DEFAULT 'butter' NOT NULL;--> statement-breakpoint
ALTER TABLE `profile` ADD `photo_uri` text;--> statement-breakpoint
ALTER TABLE `profile` ADD `reminders` integer DEFAULT true NOT NULL;