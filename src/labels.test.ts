import { describe, it, expect, vi } from 'vitest';
import { LabelsApi } from './labels.js';
import type { TrpcClient } from './client.js';
import {
  PILLAR_CATEGORY,
  PILLAR_ONLY_ENTITY_TYPES,
  TAG_ENTITY_TYPES,
  type TagEntityType,
} from './types/tag.js';

function makeClient() {
  const calls = {
    setEntityTags: vi.fn().mockResolvedValue({ entityType: 'decision', entityId: 'd1', tags: [] }),
    listForEntity: vi.fn().mockResolvedValue([]),
  };
  const client = {
    tag: {
      setEntityTags: { mutate: calls.setEntityTags },
      listForEntity: { query: calls.listForEntity },
    },
  } as unknown as TrpcClient;
  return { api: new LabelsApi(client), ...calls };
}

describe('TagEntityType', () => {
  it("matches the server's tagEntityTypeSchema", () => {
    expect(TAG_ENTITY_TYPES).toEqual([
      'action',
      'ticket',
      'feature',
      'epic',
      'project',
      'goal',
      'resource',
      'recurringTask',
      'decision',
    ]);
  });

  it('lists the Pillar-only types, and decision is not one of them', () => {
    expect(PILLAR_ONLY_ENTITY_TYPES).toEqual(['project', 'goal', 'resource', 'recurringTask']);
    expect(PILLAR_ONLY_ENTITY_TYPES).not.toContain('decision');
    expect(PILLAR_CATEGORY).toBe('pillar');
  });
});

describe('LabelsApi on a decision', () => {
  it('sets the whole tag set on a decision', async () => {
    const { api, setEntityTags } = makeClient();
    const result = await api.setEntityTags({
      entityType: 'decision',
      entityId: 'd1',
      tagIds: ['pillar-1', 'label-2'],
    });
    expect(setEntityTags).toHaveBeenCalledWith({
      entityType: 'decision',
      entityId: 'd1',
      tagIds: ['pillar-1', 'label-2'],
    });
    expect(result.entityType).toBe('decision');
  });

  it("reads a decision's tags", async () => {
    const { api, listForEntity } = makeClient();
    listForEntity.mockResolvedValueOnce([{ id: 'pillar-1', category: 'pillar' }]);
    const tags = await api.listForEntity({ entityType: 'decision', entityId: 'd1' });
    expect(listForEntity).toHaveBeenCalledWith({ entityType: 'decision', entityId: 'd1' });
    expect(tags).toHaveLength(1);
  });

  it.each(['project', 'goal', 'resource', 'recurringTask'] satisfies TagEntityType[])(
    'passes %s through as an entity type',
    async (entityType) => {
      const { api, listForEntity } = makeClient();
      await api.listForEntity({ entityType, entityId: '1' });
      expect(listForEntity).toHaveBeenCalledWith({ entityType, entityId: '1' });
    },
  );
});
