ALTER TABLE `subtasks` ADD `description` text;--> statement-breakpoint
ALTER TABLE `subtasks` ADD `status` text DEFAULT 'pending' NOT NULL;