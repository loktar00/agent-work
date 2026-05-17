ALTER TABLE `boards` ADD `commanding_agent_id` text;--> statement-breakpoint
ALTER TABLE `runs` ADD `worker_id` text;--> statement-breakpoint
ALTER TABLE `runs` ADD `heartbeat_at` text;--> statement-breakpoint
ALTER TABLE `runs` ADD `cancel_requested` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE TABLE `agent_catalog_presets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`division` text,
	`description` text,
	`persona` text,
	`tags` text,
	`suggested_runner` text,
	`suggested_model_config` text,
	`default_tool_permissions` text,
	`source` text,
	`source_ref` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);--> statement-breakpoint
CREATE INDEX `agent_catalog_presets_role_idx` ON `agent_catalog_presets` (`role`);--> statement-breakpoint
CREATE INDEX `agent_catalog_presets_division_idx` ON `agent_catalog_presets` (`division`);--> statement-breakpoint
CREATE TABLE `tool_calls` (
	`id` text PRIMARY KEY NOT NULL,
	`board_id` text NOT NULL,
	`run_id` text,
	`message_id` text,
	`agent_id` text,
	`tool_name` text NOT NULL,
	`input` text,
	`result` text,
	`status` text NOT NULL,
	`error` text,
	`started_at` text NOT NULL,
	`finished_at` text NOT NULL,
	`duration_ms` integer NOT NULL,
	FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`run_id`) REFERENCES `runs`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE set null
);--> statement-breakpoint
CREATE INDEX `tool_calls_board_id_idx` ON `tool_calls` (`board_id`);--> statement-breakpoint
CREATE INDEX `tool_calls_run_id_idx` ON `tool_calls` (`run_id`);--> statement-breakpoint
CREATE INDEX `tool_calls_agent_id_idx` ON `tool_calls` (`agent_id`);--> statement-breakpoint
CREATE INDEX `tool_calls_tool_name_idx` ON `tool_calls` (`tool_name`);
