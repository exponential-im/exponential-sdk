# Exponential SDK

The official TypeScript SDK for [Exponential](https://exponential.im) — the AI-powered alignment layer where your goals, your team, and your AI stay in sync.

Build integrations that connect daily work to meaningful outcomes. Manage workspaces, projects, and actions programmatically.

## Install

```bash
npm install exponential-sdk
```

## Quick Start

```typescript
import { ExponentialClient, saveConfig, loadConfig } from "exponential-sdk";

// Persist your credentials
saveConfig({
  apiUrl: "https://exponential.im",
  token: "your-bearer-token",
});

// Initialize the client
const config = loadConfig();
const client = new ExponentialClient({
  token: config.token,
  apiUrl: config.apiUrl,
});

// List your workspaces
const workspaces = await client.workspaces.list();

// Get today's actions
const today = await client.actions.getToday(workspaces[0].id);
```

## API Reference

### `ExponentialClient`

Create a client with your API token:

```typescript
const client = new ExponentialClient({
  token: "your-bearer-token",
  apiUrl: "https://exponential.im",
});
```

| Option | Required | Description |
|---|---|---|
| `token` | yes | Sent as `Authorization: Bearer <token>`: an `exp_agent_…` key or an API token. |
| `apiUrl` | yes | The app's base URL. Requests go to `<apiUrl>/api/trpc`. |
| `fetch` | no | Replaces the transport: every request goes through this function instead of the global `fetch`. Same signature as `fetch`. |

Supplying `fetch` lets a server run the client without a network hop, for example by handing each request to a tRPC handler in the same process:

```typescript
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

const client = new ExponentialClient({
  token,
  apiUrl: "https://exponential.im",
  fetch: (input, init) =>
    fetchRequestHandler({
      endpoint: "/api/trpc",
      req: new Request(input, init),
      router: appRouter,
      createContext: () => context,
    }),
});
```

---

### Workspaces

```typescript
const workspaces = await client.workspaces.list();
```

Returns all workspaces you have access to.

---

### Users

```typescript
const me = await client.users.me();
// { id, name, email, image, isAgent, agent: { id, name, owner: { id, name } } | null }
```

Who the token signs in as. For an External agent's `exp_agent_…` key this is the agent's own shadow user: `isAgent` is `true` and `agent` names the agent and the person who owns it. When a call comes back `FORBIDDEN`, this is the account to add to the workspace or the restricted project.

---

### Positions (roles & responsibilities)

The roles shown on a workspace's settings page (ADR-0068). Writes need a
person's own API token — agent keys get `FORBIDDEN` — and owner/admin, except
that a holder who is at least a member may edit their Position's remit.

```typescript
const { positions, members } = await client.positions.list(workspaceId);

const cto = await client.positions.create({
  workspaceId,
  title: 'Technical Director',
  remit: 'Architecture, hiring engineers, the release process.',
  notAccountableFor: 'Sales and marketing.',
  holderUserIds: [userId],
});

await client.positions.update({ workspaceId, positionId: cto.id, remit: '...' });
await client.positions.setHolders(workspaceId, cto.id, [userId, otherUserId]);
await client.positions.delete(workspaceId, cto.id);

// Upsert by title in one transaction; dryRun shows the plan first.
await client.positions.importMany({ workspaceId, dryRun: true, positions: [
  { title: 'Travel researcher', remit: 'Flights, hotels, visas.', holderUserIds: [] },
] });
```

---

### Projects

```typescript
// List all projects
const projects = await client.projects.list();

// Filter by workspace
const projects = await client.projects.list({
  workspaceId: "ws-123",
});

// Include nested actions
const projects = await client.projects.list({
  workspaceId: "ws-123",
  includeActions: true,
});
```

---

### Actions

Actions are the core work items in Exponential — tasks connected to outcomes that move the needle.

```typescript
// List active actions (excludes DONE & CANCELLED by default)
const actions = await client.actions.list();

// Filter by status, project, or assignee
const actions = await client.actions.list({
  status: "IN_PROGRESS",
  projectId: "proj-123",
  assigneeId: "user-456",
});

// Get today's actions for a workspace
const today = await client.actions.getToday("ws-123");

// Get actions within a date range
const upcoming = await client.actions.getByDateRange(
  new Date("2025-01-01"),
  new Date("2025-01-31"),
  "ws-123"
);

// Get actions by kanban status
const todo = await client.actions.getKanban({ status: "TODO" });

// Get all actions for a project
const projectActions = await client.actions.getProjectActions("proj-123");

// Create an action already assigned (by user id and/or email)
await client.actions.create({ name: "Follow up", projectId: "proj-123", assigneeEmails: ["ada@example.com"] });

// Add assignees: additive, idempotent; existing assignees stay
await client.actions.assign("act-123", { emails: ["ada@example.com"], userIds: ["user-456"] });

// Remove assignees, or clear them all
await client.actions.unassign("act-123", { userIds: ["user-456"] });
await client.actions.unassign("act-123", { all: true });

// Mixed "id or email" strings (e.g. CLI flags) → { userIds, emails }
splitAssigneeRefs(["user-456,ada@example.com"]);
```

#### Kanban Statuses

`BACKLOG` · `TODO` · `IN_PROGRESS` · `IN_REVIEW` · `DONE` · `CANCELLED`

#### Priorities

`Quick` · `Scheduled` · `1st Priority` · `2nd Priority` · `3rd Priority` · `4th Priority` · `5th Priority` · `Errand` · `Remember` · `Watch` · `Someday Maybe`

---

### Ceremonies

Recurring meeting definitions (ADR-0059) and their scheduled **occurrences**
(the page at `/w/<slug>/ceremonies/<ceremonyId>/<occurrenceId>`).

```typescript
// Definitions (Settings → Ceremonies)
const ceremonies = await client.ceremonies.list("ws-123"); // { includeInactive: true } for retired ones
const ceremony = await client.ceremonies.get("ws-123", "cer-123"); // + participants, recent/upcoming occurrences

// One meeting instance: agenda snapshot, recordings, notes page id, skip proposal
const occ = await client.ceremonies.getOccurrence("ws-123", "occ-123");
const notes = occ.notesPageId ? await client.pages.get(occ.notesPageId) : null;

// Occurrences in a window
await client.ceremonies.listOccurrences({ workspaceId: "ws-123", from, to, ceremonyId: "cer-123" });

// Async updates (standups)
await client.ceremonies.updateSummary("ws-123", "occ-123");
await client.ceremonies.saveMyUpdate({ workspaceId: "ws-123", occurrenceId: "occ-123", answers: { done: "…" }, submit: true });

// Agenda and lifecycle (owner, or workspace owner/admin, for generate/skip/post)
await client.ceremonies.generateAgenda("ws-123", "occ-123", { circulate: true });
await client.ceremonies.addAgendaItem({ workspaceId: "ws-123", occurrenceId: "occ-123", sectionKey: "blockers", title: "Pricing" });
await client.ceremonies.skipOccurrence("ws-123", "occ-123", "Nothing to discuss");
await client.ceremonies.attachMeeting("meeting-123", "occ-123");

// Write definitions
await client.ceremonies.create({ workspaceId: "ws-123", name: "Weekly Planning", cadenceRule: "FREQ=WEEKLY;BYDAY=MO;BYHOUR=10;BYMINUTE=0", timezone: "Europe/Madrid", startsOn: new Date("2026-10-05") });
await client.ceremonies.update({ workspaceId: "ws-123", id: "cer-123", isActive: false });
```

Decisions logged in an occurrence carry its `occurrenceId` (see Decisions below).

---

### Decisions

The workspace Decision Log (ADR-0060). **An open question is a decision with
status `OPEN`** — there is no separate model, and that is exactly what the
"Open questions" panel on a meeting page reads.

```typescript
// Log a decision from a meeting
await client.decisions.create({
  workspaceId: "ws-123",
  statement: "Ship the importer behind a flag",
  body: "## Context\n...\n## Consequences\n...",
  status: "ACCEPTED",
  source: "AGENT",
  transcriptionSessionId: "meeting-123",
  deciders: [{ name: "Ada", email: "ada@example.com" }],
});

// Log an open question from the same meeting
await client.decisions.create({
  workspaceId: "ws-123",
  statement: "Do we backfill historical rows?",
  status: "OPEN",
  transcriptionSessionId: "meeting-123",
});

// Both panels for one meeting, drafts included if you can edit it
const { decisions, canLogDecision } = await client.decisions.listForMeeting("meeting-123");

// The log, filtered
const open = await client.decisions.list({ workspaceId: "ws-123", statuses: ["OPEN"] });

// Answer an open question, then record what implemented it
await client.decisions.setStatus({ workspaceId: "ws-123", decisionId: "d1", status: "ACCEPTED" });
await client.decisions.linkTicket("ws-123", "d1", "ticket-123");
```

#### Titles and scope links

A decision can carry a short `title`: the outcome in six words or fewer
("Text place beats Dataminr location"). Every decision list shows the title
when there is one, with the statement under it; without one, the statement is
the row text. `create` and `update` take it (max 120 characters; pass `null`
to clear it), list and detail rows return it, and `search` matches it.

`linkScope` links a decision to one of a feature's scopes (V1, V2, ...)
instead of the whole feature. The decision then shows on the feature's
Decisions block with the scope's version, and on a Pillar page it groups under
that scope. The link's `scope` carries `{ id, version, description, featureId }`.

```typescript
await client.decisions.create({
  workspaceId: "ws-123",
  title: "Text place beats Dataminr location",
  statement: "We geolocate alerts from the place named in the text, not Dataminr's location field.",
  status: "ACCEPTED",
});
await client.decisions.linkScope("ws-123", "d1", "scope-id");
await client.decisions.update({ workspaceId: "ws-123", decisionId: "d1", title: null });
```

Titles and scope links need a server from exponential-app PR 1232 on; older
servers ignore `title` and have no `linkScope`.

#### Pillars and labels

A decision is filed under Pillars and labels. `create` takes no tags and `get`
returns none: tag a decision after creating it, through the labels API, and
read its tags back the same way. Workspace `list` rows carry `tags`, and
`tagIds` filters the log to decisions carrying **any** of the given tags
(max 50). A tag with `category === "pillar"` is a Pillar; any other is a label.

```typescript
// The log, filtered to one Pillar; each row has tags: [{ id, name, slug, color, category, archivedAt }]
const rows = await client.decisions.list({ workspaceId: "ws-123", tagIds: ["pillar-id"] });

// setEntityTags REPLACES the whole set, so read it first to add one
const current = await client.labels.listForEntity({ entityType: "decision", entityId: "d1" });
await client.labels.setEntityTags({
  entityType: "decision",
  entityId: "d1",
  tagIds: [...current.map((t) => t.id), "pillar-id"],
});
```

`setEntityTags` and `listForEntity` take `action`, `ticket`, `feature`, `epic`,
`decision` (Pillars and labels) and `project`, `goal`, `resource`,
`recurringTask` (Pillars only).

#### Statuses

`OPEN` (open question) · `PROPOSED` · `ACCEPTED` · `SUPERSEDED` · `DEPRECATED`

`SUPERSEDED` and `DEPRECATED` are reached through `setStatus`, never as a
birth state.

#### Sources

`MEETING` · `MANUAL` · `AGENT`

#### Evidence

Evidence turns are quotes from the meeting's transcript, and the server checks
them: the `turnIndex` must resolve to a real turn and the words must be that
turn's (compared loosely for case, punctuation and whitespace). Turns that
don't match are **dropped**, and `speaker`/`startTime` are replaced with the
transcript's own values. Evidence therefore requires `transcriptionSessionId`;
sending it without one is a `BAD_REQUEST`.

```typescript
// Let the server propose decisions from a meeting, for someone to review
const { draftCount, discardedWithoutEvidence } =
  await client.decisions.extractDrafts("meeting-123");
```

---

### Databases

Typed tables inside pages (ADR-0078). A database is a block in a page's body,
owned by that page; each row is a page of its own (body, comments, history,
URL) hidden from the Pages list. **Writes are typed**: every value is checked
against its property's type and a bad one is refused naming the property
(`error.data.property`). Reading the holding page with `pages.get` shows the
table; this API is for the writes and for reading rows as data.

```typescript
// Create a database on a page, then place its block by appending the marker
const page = await client.pages.get("page-123");
const metrics = await client.databases.create({ pageId: page.id, name: "Metrics" });
await client.pages.update({
  id: page.id,
  body: `${page.body}\n\n${metrics.marker}`,
  baseVersion: page.docVersion,
  note: "Add the Metrics database",
});

// Properties: title exists from creation; add the rest
await client.databases.addProperty({
  id: metrics.id,
  name: "Status",
  type: "select",
  options: [{ name: "Not measured" }, { name: "Instrumenting" }, { name: "Tracked" }],
});
await client.databases.addProperty({ id: metrics.id, name: "Owner", type: "person" });

// Rows: values by property name (or id); a select by option name
const row = await client.databases.createRow(
  metrics.id,
  { Name: "Alert latency", Status: "Tracked", Owner: "user-123" },
  { note: "Imported from the CLEAR page" },
);
await client.databases.updateRow(row.id, { Status: "Instrumenting" }, { note: "Re-measuring" });

// Read rows through the saved view, or through a view of your own
const { rows, nextCursor, columns } = await client.databases.listRows(metrics.id, {
  view: { filters: [{ propertyId: "Status", op: "eq", value: "Tracked" }], hiddenPropertyIds: [], propertyOrder: [] },
});
```

#### Property types

`title` · `text` · `number` · `select` · `multiSelect` · `date` · `checkbox` ·
`url` · `person` · `relation` (V3), plus read-only `createdTime` ·
`lastEditedTime` · `createdBy`. Property and option ids are stable: renaming
never rewrites a row. Stored values: `select` holds the option **id**,
`multiSelect` and `person` lists, `date` an ISO 8601 string.

#### Lifecycle

Removing the block from the page **detaches** the database (`detachedAt`);
its rows stay until `databases.delete`, the page's deletion, or the daily
purge 30 days later. Writing the marker back re-attaches it. Rows follow the
holding page for access, placement and publishing — `pages.move`,
`pages.publish` and sharing on a row page are refused.

---

### Agent guidance

The method and scoped context every agent surface reads (D-0010). The payload is **guidance, not authority** (ADR-0071): it never grants permission for anything. Responses are returned unchanged, so fields the server adds later pass through.

```typescript
const ctx = await client.agentGuidance.context({ workspaceId, projectId });
ctx.instructions;      // [{ scope, sourceId, text }]
ctx.decisions.items;   // [{ label: 'D-0042', statement, url, ... }], plus ctx.decisions.omitted
ctx.adrs.items;        // [{ label: 'API-0003', title, url, ... }] (write roles only)

const method = await client.agentGuidance.method(); // throws NOT_FOUND until published
```

### Configuration

Credentials are stored persistently using the OS keychain via [`conf`](https://github.com/sindresorhus/conf).

```typescript
import {
  saveConfig,
  loadConfig,
  clearConfig,
  isAuthenticated,
  getConfigPath,
} from "exponential-sdk";

saveConfig({
  apiUrl: "https://exponential.im",
  token: "your-bearer-token",
  defaultWorkspaceId: "ws-123",
  defaultWorkspaceSlug: "my-team",
});

if (isAuthenticated()) {
  const config = loadConfig();
  console.log(config.token);
}

// For multi-project setups, create isolated config stores
import { createConfigStore } from "exponential-sdk";

const store = createConfigStore({ projectName: "my-app" });
store.saveConfig({ apiUrl: "...", token: "..." });
```

---

### Error Handling

```typescript
import { isTRPCError } from "exponential-sdk";

try {
  const actions = await client.actions.list();
} catch (error) {
  if (isTRPCError(error)) {
    console.error("API error:", error.message);
  }
}
```

## Contributing

### Who merges: the PR-Agent auto-merge gate, or James

`.github/workflows/pr-agent-automerge.yml` squash-merges a PR into `main` once CI
(`Build, typecheck & test`) is green and PR-Agent left nothing blocking on the latest
commit. **Agent sessions do not merge PRs.**

PR-Agent runs review-only: GLM 5.3 through OpenRouter, one call per push. It doesn't
rewrite descriptions or post code suggestions. What blocks is a review finding tagged
`[blocker]` or left untagged, or a security concern. Fix those; `[minor]` findings don't
hold the merge. Every push is reviewed again and paid for, so batch fixes into one push
rather than pushing each one separately. The model and house rules are in `.pr_agent.toml`;
PR-Agent reads that file from `main`, so editing it on a branch changes nothing until merged.

- Never run `gh pr merge`, and never pass `--merge` to `/ship-this` or `/ship-ticket`. Open
  the PR, apply PR-Agent's findings, push, and stop at "in review". The gate (or James) merges.
- Never add the `pr-agent-ack` label. It means "James saw the blocker and is merging anyway".
  Only James applies it, and the gate ignores it from anyone else.
- A PR you can't get past the gate is left for James with a comment saying what blocks it
  and why you could not fix it.
- `no-automerge` on a PR keeps it human-only. Don't remove it.
- PRs from forks and PRs opened by bots are never auto-merged; James merges those.

## Requirements

- Node.js >= 18.0.0

## License

GNU Affero General Public License v3.0 or later (AGPL-3.0-or-later). See [LICENSE](LICENSE).
