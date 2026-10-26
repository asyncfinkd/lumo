ALTER TABLE `categories` ADD `icon` text DEFAULT 'basket' NOT NULL;--> statement-breakpoint
ALTER TABLE `categories` ADD `color` text DEFAULT 'butter' NOT NULL;--> statement-breakpoint
ALTER TABLE `categories` ADD `renamed` integer DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE `categories` SET `icon` = 'coffee', `color` = 'latte' WHERE `id` = 'coffee';--> statement-breakpoint
UPDATE `categories` SET `icon` = 'basket', `color` = 'butter' WHERE `id` = 'groceries';--> statement-breakpoint
UPDATE `categories` SET `icon` = 'car', `color` = 'sky' WHERE `id` = 'transport';--> statement-breakpoint
UPDATE `categories` SET `icon` = 'gift', `color` = 'blush' WHERE `id` = 'treats';--> statement-breakpoint
UPDATE `categories` SET `icon` = 'bolt', `color` = 'sage' WHERE `id` = 'bills';--> statement-breakpoint
UPDATE `categories` SET `icon` = 'house', `color` = 'lilac' WHERE `id` = 'home';--> statement-breakpoint
UPDATE `categories` SET `icon` = 'wallet', `color` = 'mint' WHERE `id` = 'salary';--> statement-breakpoint
UPDATE `categories` SET `icon` = 'book', `color` = 'sky' WHERE `id` = 'freelance';--> statement-breakpoint
UPDATE `categories` SET `icon` = 'gift', `color` = 'blush' WHERE `id` = 'gift';--> statement-breakpoint
UPDATE `categories` SET `icon` = 'wallet', `color` = 'butter' WHERE `id` = 'refund';
