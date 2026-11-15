// Agent guidance types matching the app's `agentGuidance` router (D-0010).
//
// The payload is GUIDANCE, not authority (ADR-0071): nothing in it grants
// permission for anything. The server keeps adding fields, so every object
// carries an index signature and the SDK returns the response unchanged —
// fields this version does not know about still reach the caller.

/** Which scope an instruction came from. */
export type AgentInstructionScope = 'workspace' | 'project' | (string & {});

export interface AgentContextInstruction {
  scope: AgentInstructionScope;
  /** The workspace or project the text belongs to. */
  sourceId: string;
  text: string;
  [key: string]: unknown;
}

export interface AgentContextDecision {
  id: string;
  /** `D-0042`. */
  label: string;
  statement: string;
  /** Linked to the project, or to the project's product (and no project). */
  scope: 'project' | 'product' | (string & {});
  decidedAt: string | null;
  /** The full decision (body, evidence, links) in the app. */
  url: string;
  [key: string]: unknown;
}

export interface AgentContextAdr {
  id: string;
  /** `API-0003` (the repo's short code, else `ADR`); null when the file has no number. */
  label: string | null;
  title: string;
  /** Always `ACCEPTED` today: only accepted ADRs are listed. */
  status: 'ACCEPTED' | (string & {});
  /** Its repo is on the project's product, or it is linked to a ticket/feature there. */
  scope: 'product' | 'linked' | (string & {});
  decidedAt: string | null;
  /** The full ADR in the app's Decision Log. */
  url: string;
  [key: string]: unknown;
}

/** A capped list: newest first, the rest counted in `omitted`. */
export interface AgentContextList<T> {
  items: T[];
  /** Matching entries left out by the server's cap. */
  omitted: number;
  [key: string]: unknown;
}

/** `agentGuidance.context` — mirrors the app's `ContextPayload`. */
export interface AgentContextPayload {
  workspace: { id: string; slug: string; name: string; [key: string]: unknown };
  project: { id: string; name: string; [key: string]: unknown } | null;
  /** AI instructions never authorise anything (ADR-0071). */
  authority: 'guidance';
  /** Scopes with no text are omitted. */
  instructions: AgentContextInstruction[];
  /** Byte-identical to the block chat injects; null when no scope has text. */
  assembled: string | null;
  /** The project's accepted decisions (statements only). Empty without a project. */
  decisions: AgentContextList<AgentContextDecision>;
  /** Accepted ADRs on the project's product; empty for callers without a write role. */
  adrs: AgentContextList<AgentContextAdr>;
  /** `sha256:<hex>` over the instructions, decisions and ADRs. */
  revision: string;
  generatedAt: string;
  [key: string]: unknown;
}

export interface AgentMethodDocument {
  id: string;
  title: string;
  href: string;
  /** The page's Markdown body, frontmatter excluded: exactly what /docs renders. */
  markdown: string;
  [key: string]: unknown;
}

/** `agentGuidance.method` — mirrors the app's `MethodPayload`. */
export interface AgentMethodPayload {
  version: string;
  status: 'draft' | 'published';
  /** `sha256:<hex>` over the documents returned. */
  contentHash: string;
  publishedAt: string | null;
  canonicalSource: {
    repo: string;
    path: string;
    /** `/docs/method` once published; null while the method is dark. */
    url: string | null;
    [key: string]: unknown;
  };
  documents: AgentMethodDocument[];
  [key: string]: unknown;
}
