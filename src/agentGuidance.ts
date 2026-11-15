import type { TrpcClient } from './client.js';
import type { AgentContextPayload, AgentMethodPayload } from './types/agentGuidance.js';

export interface AgentContextOptions {
  /** Workspace id (not slug). The caller must be a member. */
  workspaceId: string;
  /** Narrow to one project in that workspace; a project outside it is BAD_REQUEST. */
  projectId?: string;
}

export interface AgentMethodOptions {
  /** Lets members of a preview workspace see a draft method before it is published. */
  workspaceId?: string;
}

/**
 * Thin wrapper over the app's `agentGuidance` router (D-0010). Responses come
 * back unchanged, so fields added on the server reach callers before the SDK
 * types learn about them. The payload is guidance, not authority (ADR-0071).
 */
export class AgentGuidanceApi {
  constructor(private client: TrpcClient) {}

  /**
   * The workspace's (and optional project's) AI instructions, accepted
   * decisions and ADRs — assembled exactly as in-app chat assembles them.
   */
  async context(options: AgentContextOptions): Promise<AgentContextPayload> {
    const input: { workspaceId: string; projectId?: string } = {
      workspaceId: options.workspaceId,
    };
    if (options.projectId) input.projectId = options.projectId;
    return (await this.client.agentGuidance.context.query(input)) as AgentContextPayload;
  }

  /**
   * The current method version. Throws a NOT_FOUND tRPC error when no method
   * is published (and the caller may not preview a draft).
   */
  async method(options: AgentMethodOptions = {}): Promise<AgentMethodPayload> {
    const input = options.workspaceId ? { workspaceId: options.workspaceId } : undefined;
    return (await this.client.agentGuidance.method.query(input)) as AgentMethodPayload;
  }
}
