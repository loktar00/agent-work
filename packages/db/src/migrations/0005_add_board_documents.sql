CREATE TABLE `board_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`board_id` text NOT NULL,
	`section` text NOT NULL,
	`title` text NOT NULL,
	`content` text,
	`updated_by` text,
	`updated_at` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `board_documents_board_id_idx` ON `board_documents` (`board_id`);
