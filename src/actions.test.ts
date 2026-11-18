import { describe, it, expect, vi } from 'vitest';
import { ActionsApi, splitAssigneeRefs } from './actions.js';
import type { TrpcClient } from './client.js';

function makeApi() {
  const assign = vi.fn().mockResolvedValue({ id: 'a1' });
  const unassign = vi.fn().mockResolvedValue({ id: 'a1' });
  const create = vi.fn().mockResolvedValue({ id: 'a1' });
  const client = { action: { assign: { mutate: assign }, unassign: { mutate: unassign }, create: { mutate: create } } };
  return { api: new ActionsApi(client as unknown as TrpcClient), assign, unassign, create };
}

describe('splitAssigneeRefs', () => {
  it('splits ids from emails, accepts comma lists, and dedupes', () => {
    expect(splitAssigneeRefs(['u1,ada@example.com', ' u2 ', 'u1', ''])).toEqual({
      userIds: ['u1', 'u2'],
      emails: ['ada@example.com'],
    });
  });
});

describe('ActionsApi assignees', () => {
  it('assign sends ids and emails to action.assign', async () => {
    const { api, assign } = makeApi();
    await api.assign('a1', { userIds: ['u1'], emails: ['ada@example.com'] });
    expect(assign).toHaveBeenCalledWith({ actionId: 'a1', userIds: ['u1'], emails: ['ada@example.com'] });
  });

  it('assign by email alone sends an empty userIds list', async () => {
    const { api, assign } = makeApi();
    await api.assign('a1', { emails: ['ada@example.com'] });
    expect(assign).toHaveBeenCalledWith({ actionId: 'a1', userIds: [], emails: ['ada@example.com'] });
  });

  it('unassign all clears every assignee', async () => {
    const { api, unassign } = makeApi();
    await api.unassign('a1', { all: true });
    expect(unassign).toHaveBeenCalledWith({ actionId: 'a1', userIds: [], all: true });
  });

  it('create forwards assigneeIds and assigneeEmails', async () => {
    const { api, create } = makeApi();
    await api.create({ name: 'Follow up', assigneeIds: ['u1'], assigneeEmails: ['ada@example.com'] });
    expect(create).toHaveBeenCalledWith({ name: 'Follow up', assigneeIds: ['u1'], assigneeEmails: ['ada@example.com'] });
  });
});
