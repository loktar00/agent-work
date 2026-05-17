/** Lightweight HTTP client for talking to the AWALL server */

export class ServerAPI {
  constructor(public baseUrl: string, private workerId: string) {}

  private async request<T>(path: string, opts?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = { ...opts?.headers as Record<string, string> };
    if (opts?.body != null) headers["Content-Type"] = "application/json";

    const res = await fetch(url, { ...opts, headers });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`${res.status} ${res.statusText}: ${body}`);
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  /** Poll for queued runs */
  async getQueuedRuns(boardId?: string): Promise<QueuedRun[]> {
    const qs = boardId ? `?boardId=${boardId}` : "";
    return this.request(`/api/runs/queued${qs}`);
  }

  /** Claim a run — returns full run payload with agent config */
  async claimRun(runId: string): Promise<ClaimedRun | null> {
    try {
      return await this.request(`/api/runs/${runId}/claim`, {
        method: "POST",
        body: JSON.stringify({ workerId: this.workerId }),
      });
    } catch (err: any) {
      if (err.message?.includes("409")) return null; // already claimed
      throw err;
    }
  }

  /** Post a run event (stdout/stderr) */
  async postEvent(runId: string, type: string, data: string): Promise<void> {
    await this.request(`/api/runs/${runId}/events`, {
      method: "POST",
      body: JSON.stringify({ type, data }),
    });
  }

  /** Report run completion */
  async completeRun(runId: string, exitCode: number): Promise<void> {
    await this.request(`/api/runs/${runId}/complete`, {
      method: "POST",
      body: JSON.stringify({ exitCode }),
    });
  }

  /** Worker heartbeat. Returns whether cancellation has been requested. */
  async heartbeat(runId: string): Promise<{ cancelRequested: boolean }> {
    return this.request(`/api/runs/${runId}/heartbeat`, {
      method: "POST",
      body: JSON.stringify({ workerId: this.workerId }),
    });
  }

  /** Fetch a versioned context envelope for a run */
  async getRunContext(runId: string): Promise<unknown> {
    return this.request(`/api/runs/${runId}/context`);
  }

  /** Fetch allowed tools for a board, optionally scoped to an agent */
  async getTools(boardId: string, agentId?: string): Promise<unknown> {
    const qs = agentId ? `?agentId=${encodeURIComponent(agentId)}` : "";
    return this.request(`/api/boards/${boardId}/tools${qs}`);
  }

  /** Execute a board tool through the server registry */
  async callTool(
    boardId: string,
    toolName: string,
    input: Record<string, unknown>,
    opts?: { agentId?: string; runId?: string; actorId?: string },
  ): Promise<unknown> {
    return this.request(`/api/boards/${boardId}/tools/${toolName}`, {
      method: "POST",
      body: JSON.stringify({
        input,
        agentId: opts?.agentId,
        runId: opts?.runId,
        actorType: opts?.agentId ? "agent" : "worker",
        actorId: opts?.actorId ?? opts?.agentId ?? this.workerId,
      }),
    });
  }

  /** Post a message to a card thread */
  async postMessage(boardId: string, cardId: string, content: string): Promise<void> {
    await this.request(`/api/messages`, {
      method: "POST",
      body: JSON.stringify({
        boardId,
        cardId,
        authorType: "agent",
        authorId: this.workerId,
        content,
      }),
    });
  }
}

export interface QueuedRun {
  id: string;
  boardId: string;
  cardId: string;
  agentId: string;
  runnerId: string | null;
  status: string;
  prompt: string | null;
}

export interface ClaimedRun extends QueuedRun {
  board: { projectDir: string | null; worktreeMode: string } | null;
  card: { title: string; description: string | null } | null;
  agentConfig: {
    id: string;
    name: string;
    role: string;
    persona: string | null;
    runnerId: string | null;
    modelConfig: Record<string, unknown> | null;
    llmConfig: { provider: string; baseUrl: string; apiKey: string; model: string } | null;
    toolPermissions: Record<string, unknown> | null;
  } | null;
  context: {
    card: Record<string, unknown>;
    subtasks: unknown[];
    recentMessages: unknown[];
    artifacts: unknown[];
  } | null;
  columns: {
    columnId: string;
    columnName: string;
    position: number;
    agentId: string | null;
    agentName: string | null;
    agentRole: string | null;
  }[] | null;
  projectDoc: {
    id: string;
    section: string;
    title: string;
    content: string | null;
    updatedBy: string | null;
    updatedAt: string;
    position: number;
  }[] | null;
}
