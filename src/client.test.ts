import { afterEach, describe, expect, it, vi } from 'vitest';
import superjson from 'superjson';
import { ExponentialClient } from './index.js';

const WORKSPACES = [{ id: 'w1', slug: 'acme', name: 'Acme' }];

/** A tRPC batch response carrying one superjson-encoded result. */
function batchResponse(data: unknown): Response {
  return new Response(JSON.stringify([{ result: { data: superjson.serialize(data) } }]), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function requestUrl(input: unknown): string {
  return input instanceof Request ? input.url : String(input);
}

describe('ExponentialClient fetch option', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends every request through the supplied fetch, with the bearer token and the tRPC URL', async () => {
    const globalFetch = vi.fn();
    vi.stubGlobal('fetch', globalFetch);
    const fetch = vi.fn(async () => batchResponse(WORKSPACES));

    const client = new ExponentialClient({ token: 'exp_agent_abc', apiUrl: 'https://example.test/', fetch });
    const workspaces = await client.workspaces.list();

    expect(workspaces).toEqual(WORKSPACES);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(globalFetch).not.toHaveBeenCalled();

    const [input, init] = fetch.mock.calls[0] as unknown as [unknown, RequestInit | undefined];
    const url = new URL(requestUrl(input));
    expect(url.origin + url.pathname).toBe('https://example.test/api/trpc/workspace.list');
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer exp_agent_abc');
  });

  it('uses the global fetch when none is supplied', async () => {
    const globalFetch = vi.fn(async () => batchResponse(WORKSPACES));
    vi.stubGlobal('fetch', globalFetch);

    const client = new ExponentialClient({ token: 'tok', apiUrl: 'https://example.test' });
    const workspaces = await client.workspaces.list();

    expect(workspaces).toEqual(WORKSPACES);
    expect(globalFetch).toHaveBeenCalledTimes(1);
    const [input, init] = globalFetch.mock.calls[0] as unknown as [unknown, RequestInit | undefined];
    expect(requestUrl(input)).toMatch(/^https:\/\/example\.test\/api\/trpc\/workspace\.list/);
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer tok');
  });
});
