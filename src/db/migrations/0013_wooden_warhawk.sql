CREATE INDEX `jar_entries_account_idx` ON `jar_entries` (`account_id`);--> statement-breakpoint
CREATE INDEX `transactions_account_idx` ON `transactions` (`account_id`);--> statement-breakpoint
CREATE INDEX `transactions_category_idx` ON `transactions` (`category_id`);--> statement-breakpoint
CREATE INDEX `transactions_kind_date_idx` ON `transactions` (`kind`,`date`);