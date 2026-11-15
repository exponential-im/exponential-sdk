import { describe, it, expect, vi } from 'vitest';
import { AgentGuidanceApi } from './agentGuidance.js';
import type { TrpcClient } from './client.js';

const CONTEXT = {
  workspace: { id: 'w1', slug: 'acme', name: 'Acme' },
  project: { id: 'p1', name: 'Launch' },
  authority: 'guidance',
  instructions: [{ scope: 'workspace', sourceId: 'w1', text: 'Be terse.' }],
  assembled: 'Be terse.',
  decisions: {
    items: [
      { id: 'd1', label: 'D-0042', statement: 'Ship weekly', scope: 'project', decidedAt: null, url: 'https://x/d/d1' },
    ],
    omitted: 3,
  },
  adrs: {
    items: [
      { id: 'a1', label: 'API-0003', title: 'Use tRPC', status: 'ACCEPTED', scope: 'product', decidedAt: null, url: 'https://x/a1' },
    ],
    omitted: 0,
  },
  revision: 'sha256:abc',
  generatedAt: '2026-11-15T00:00:00.000Z',
  // A field this SDK version does not know about yet.
  futureField: { hello: 'world' },
};

function makeApi(result: unknown = CONTEXT) {
  const context = vi.fn().mockResolvedValue(result);
  const method = vi.fn().mockResolvedValue({ version: '1.0.0', status: 'published', documents: [] });
  const client = { agentGuidance: { context: { query: context }, method: { query: method } } };
  return { api: new AgentGuidanceApi(client as unknown as TrpcClient), context, method };
}

describe('AgentGuidanceApi.context', () => {
  it('calls agentGuidance.context with workspace and project', async () => {
    const { api, context } = makeApi();
    await api.context({ workspaceId: 'w1', projectId: 'p1' });
    expect(context).toHaveBeenCalledWith({ workspaceId: 'w1', projectId: 'p1' });
  });

  it('omits projectId when not given', async () => {
    const { api, context } = makeApi();
    await api.context({ workspaceId: 'w1' });
    expect(context).toHaveBeenCalledWith({ workspaceId: 'w1' });
  });

  it('returns the payload unchanged, unknown fields included', async () => {
    const { api } = makeApi();
    const result = await api.context({ workspaceId: 'w1' });
    expect(result).toBe(CONTEXT);
    expect(result.decisions.items[0]!.label).toBe('D-0042');
    expect(result.adrs.items[0]!.title).toBe('Use tRPC');
    expect(result['futureField']).toEqual({ hello: 'world' });
  });
});

describe('AgentGuidanceApi.method', () => {
  it('sends no input without a workspace', async () => {
    const { api, method } = makeApi();
    await api.method();
    expect(method).toHaveBeenCalledWith(undefined);
  });

  it('forwards workspaceId for draft preview', async () => {
    const { api, method } = makeApi();
    const result = await api.method({ workspaceId: 'w1' });
    expect(method).toHaveBeenCalledWith({ workspaceId: 'w1' });
    expect(result.version).toBe('1.0.0');
  });
});
