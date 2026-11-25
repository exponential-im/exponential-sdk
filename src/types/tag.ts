// Tag (aka label) types matching the Exponential API responses.

/**
 * Everything `tag.setEntityTags` and `tag.listForEntity` accept.
 *
 * - `action`, `ticket`, `feature`, `epic` and `decision` take both Pillars and
 *   ordinary labels.
 * - `project`, `goal`, `resource` and `recurringTask` take Pillars only; the
 *   server rejects an ordinary label on them.
 *
 * A goal's `entityId` is its integer id passed as a string.
 */
export type TagEntityType =
  | 'action'
  | 'ticket'
  | 'feature'
  | 'epic'
  | 'project'
  | 'goal'
  | 'resource'
  | 'recurringTask'
  | 'decision';

/** Every {@link TagEntityType}, in the server's order. */
export const TAG_ENTITY_TYPES: readonly TagEntityType[] = [
  'action',
  'ticket',
  'feature',
  'epic',
  'project',
  'goal',
  'resource',
  'recurringTask',
  'decision',
];

/** Entity types that take Pillars only, never ordinary labels. */
export const PILLAR_ONLY_ENTITY_TYPES: readonly TagEntityType[] = [
  'project',
  'goal',
  'resource',
  'recurringTask',
];

/** A tag whose `category` is this is a Pillar; any other category is a label. */
export const PILLAR_CATEGORY = 'pillar';

export interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string;
  description: string | null;
  category: string | null;
  isSystem: boolean;
  workspaceId: string | null;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TagListResult {
  globalTags: Tag[];
  workspaceTags: Tag[];
  allTags: Tag[];
}

/**
 * The trimmed tag every `decision.list` row carries in `tags`. A row's
 * Pillars are the tags with `category === 'pillar'`; the rest are labels.
 */
export interface TagRef {
  id: string;
  name: string;
  slug: string;
  color: string;
  category: string | null;
  archivedAt: Date | null;
}
