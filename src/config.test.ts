import { describe, expect, it, vi } from 'vitest';

// conf writes a file when it is constructed. Count constructions instead.
const { constructed } = vi.hoisted(() => ({ constructed: [] as string[] }));
vi.mock('conf', () => ({
  default: class FakeConf {
    path: string;
    private data = new Map<string, string>();
    constructor(options: { projectName: string }) {
      constructed.push(options.projectName);
      this.path = `/fake/${options.projectName}/config.json`;
    }
    get(key: string) {
      return this.data.get(key) ?? '';
    }
    set(key: string, value: string) {
      this.data.set(key, value);
    }
    clear() {
      this.data.clear();
    }
  },
}));

describe('default config store', () => {
  it('is not created when the SDK is imported, only on first use, and only once', async () => {
    const sdk = await import('./index.js');
    expect(typeof sdk.ExponentialClient).toBe('function');
    expect(constructed).toEqual([]);

    new sdk.ExponentialClient({ token: 't', apiUrl: 'https://example.test' });
    expect(constructed).toEqual([]);

    expect(sdk.isAuthenticated()).toBe(false);
    expect(constructed).toEqual(['exponential-sdk']);

    sdk.saveConfig({ token: 'tok', apiUrl: 'https://example.test' });
    expect(sdk.loadConfig()).toMatchObject({ token: 'tok', apiUrl: 'https://example.test' });
    expect(sdk.getConfigPath()).toBe('/fake/exponential-sdk/config.json');
    sdk.clearConfig();
    expect(constructed).toEqual(['exponential-sdk']);
  });
});
