ALTER TABLE boards ADD COLUMN project_dir TEXT;--> statement-breakpoint
ALTER TABLE boards ADD COLUMN worktree_mode TEXT DEFAULT 'none';
