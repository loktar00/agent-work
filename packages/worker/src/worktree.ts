import { execSync, type ExecSyncOptions } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const execOpts = (cwd: string): ExecSyncOptions => ({
  cwd,
  encoding: "utf-8" as BufferEncoding,
  stdio: ["pipe", "pipe", "pipe"],
  timeout: 30000,
});

export function isGitRepo(dir: string): boolean {
  try {
    execSync("git rev-parse --git-dir", execOpts(dir));
    return true;
  } catch {
    return false;
  }
}

export function getMainBranch(dir: string): string {
  try {
    const result = execSync(
      "git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null || echo refs/heads/main",
      execOpts(dir),
    ) as unknown as string;
    return result.trim().replace("refs/remotes/origin/", "").replace("refs/heads/", "");
  } catch {
    return "main";
  }
}

export function acquireWorktree(repoDir: string, branchName: string, baseBranch?: string): string {
  const parentDir = path.dirname(repoDir);
  const repoName = path.basename(repoDir);
  const wtDir = path.join(parentDir, `${repoName}-wt-${branchName.replace(/\//g, "-")}`);

  if (existsSync(wtDir)) {
    try { execSync("git worktree prune", execOpts(repoDir)); } catch { /* ignore */ }
  }

  const base = baseBranch ?? getMainBranch(repoDir);

  try {
    execSync(`git worktree add "${wtDir}" -b ${branchName} ${base}`, execOpts(repoDir));
  } catch {
    try {
      execSync(`git worktree add "${wtDir}" ${branchName}`, execOpts(repoDir));
    } catch (err) {
      throw new Error(`Failed to create worktree for branch ${branchName}: ${err}`);
    }
  }

  return wtDir;
}

export function releaseWorktree(repoDir: string, wtDir: string): void {
  try {
    execSync(`git worktree remove "${wtDir}" --force`, execOpts(repoDir));
  } catch {
    try { execSync("git worktree prune", execOpts(repoDir)); } catch { /* ignore */ }
  }
}

export function branchNameFromCard(cardId: string, title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `awall/${slug}-${cardId.slice(0, 8)}`;
}
