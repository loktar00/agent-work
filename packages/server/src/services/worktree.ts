import { execSync, type ExecSyncOptions } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

export interface WorktreeInfo {
  path: string;
  branch: string;
  head: string;
  bare: boolean;
}

const execOpts = (cwd: string): ExecSyncOptions => ({
  cwd,
  encoding: "utf-8",
  stdio: ["pipe", "pipe", "pipe"],
  timeout: 30000,
});

export function worktreeService() {
  return {
    /** Check if a directory is a git repository */
    isGitRepo(dir: string): boolean {
      try {
        execSync("git rev-parse --git-dir", execOpts(dir));
        return true;
      } catch {
        return false;
      }
    },

    /** Get the main branch name */
    getMainBranch(dir: string): string {
      try {
        const result = execSync(
          "git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null || echo refs/heads/main",
          execOpts(dir),
        ) as unknown as string;
        return result.trim().replace("refs/remotes/origin/", "").replace("refs/heads/", "");
      } catch {
        return "main";
      }
    },

    /** List all worktrees for a repo */
    list(repoDir: string): WorktreeInfo[] {
      try {
        const output = execSync(
          "git worktree list --porcelain",
          execOpts(repoDir),
        ) as unknown as string;

        const worktrees: WorktreeInfo[] = [];
        let current: Partial<WorktreeInfo> = {};

        for (const line of output.split("\n")) {
          if (line.startsWith("worktree ")) {
            if (current.path) worktrees.push(current as WorktreeInfo);
            current = { path: line.slice(9).trim(), bare: false };
          } else if (line.startsWith("HEAD ")) {
            current.head = line.slice(5).trim();
          } else if (line.startsWith("branch ")) {
            current.branch = line.slice(7).trim().replace("refs/heads/", "");
          } else if (line === "bare") {
            current.bare = true;
          } else if (line === "" && current.path) {
            worktrees.push(current as WorktreeInfo);
            current = {};
          }
        }
        if (current.path) worktrees.push(current as WorktreeInfo);

        return worktrees;
      } catch {
        return [];
      }
    },

    /** Find or create a worktree for a task. Returns the worktree directory path. */
    acquire(
      repoDir: string,
      branchName: string,
      baseBranch?: string,
    ): string {
      const worktrees = this.list(repoDir);

      // Check if a worktree for this branch already exists
      const existing = worktrees.find((w) => w.branch === branchName);
      if (existing) return existing.path;

      // Create worktree directory next to the repo
      const parentDir = path.dirname(repoDir);
      const repoName = path.basename(repoDir);
      const wtDir = path.join(parentDir, `${repoName}-wt-${branchName}`);

      if (existsSync(wtDir)) {
        // Directory exists but no worktree — might be leftover. Prune first.
        try {
          execSync("git worktree prune", execOpts(repoDir));
        } catch { /* ignore */ }
      }

      const base = baseBranch ?? this.getMainBranch(repoDir);

      try {
        // Try creating with a new branch
        execSync(
          `git worktree add "${wtDir}" -b ${branchName} ${base}`,
          execOpts(repoDir),
        );
      } catch {
        // Branch might already exist — try without -b
        try {
          execSync(
            `git worktree add "${wtDir}" ${branchName}`,
            execOpts(repoDir),
          );
        } catch (err) {
          throw new Error(
            `Failed to create worktree for branch ${branchName}: ${err}`,
          );
        }
      }

      return wtDir;
    },

    /** Release a worktree (remove it) */
    release(repoDir: string, wtDir: string): void {
      try {
        execSync(`git worktree remove "${wtDir}" --force`, execOpts(repoDir));
      } catch {
        // If remove fails, just prune
        try {
          execSync("git worktree prune", execOpts(repoDir));
        } catch { /* ignore */ }
      }
    },

    /** Generate a branch name from a card title */
    branchNameFromCard(cardId: string, title: string): string {
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40);
      return `awall/${slug}-${cardId.slice(0, 8)}`;
    },
  };
}
