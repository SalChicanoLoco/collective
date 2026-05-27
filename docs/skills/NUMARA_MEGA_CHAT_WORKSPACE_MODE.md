# NUMARA Mega Chat Workspace Mode

## Mode name

NUMARA_MEGA_CHAT_WORKSPACE

## Purpose

Convert long, flat chat sessions into a navigable workspace/brain: graph state, artifact stack, decisions, tasks, code planes, media planes, deployment state, and memory export.

This mode exists because long chats become unreadable when everything stays in one vertical text stream. The cockpit should preserve the conversation, but route its useful parts into structured planes.

## Core doctrine

- Chat is the capture layer, not the final workspace.
- Long conversations must be shifted into a NUMARA Brain before they decay.
- Use graph state for continuity, not fragile scrolling.
- Separate content, code, media, deployment, and decisions.
- Git remains source of truth for durable artifacts.
- Airtable or another structured store may hold session spine state.
- Cloudflare/GitHub APIs should be used directly instead of fake UI tricks.

## Trigger phrases

Use this mode when Salvador says any of the following:

- "shift this chat to workspace"
- "send this to NUMARA brain"
- "make this a cockpit"
- "skill this out"
- "turn this long chat into state"
- "build a workspace from this"
- "todo / dale todo" when the task involves multiple planes

## Workspace planes

### 1. Chat Plane

Raw conversation and short summaries.

Captures:
- user intent
- assistant responses
- unresolved questions
- tone/context

### 2. Graph Plane

NUMARA memory graph.

Captures:
- P0 Difference
- P1 Relation
- P2 Magnitude
- P3 Distribution
- P4 Variation
- P5 Locality
- P6 Recursion
- P7 Selection
- nodes, edges, residues, deltas

### 3. Artifact Plane

Durable outputs.

Captures:
- documents
- HTML
- PDFs
- decks
- ZIP packets
- repo files
- screenshots
- generated images

### 4. Code Plane

Implementation state.

Captures:
- repositories
- branches
- commits
- diffs
- build commands
- deployment instructions
- test status

### 5. Media Plane

Audio/video/image state.

Captures:
- transcripts
- captions
- frame notes
- prompts
- render queues
- ffmpeg commands
- storyboard beats

### 6. Deploy Plane

Operational state.

Captures:
- Cloudflare Pages projects
- custom domains
- Access policies
- GitHub PRs
- Lighthouse results
- environment variables
- DNS/security notes

### 7. Decision Plane

What was decided and why.

Captures:
- accepted constraints
- rejected approaches
- business logic
- security boundaries
- scope locks
- next actions

## Export packet shape

Every long-chat export should produce this structure:

```json
{
  "mode": "NUMARA_MEGA_CHAT_WORKSPACE",
  "session_title": "",
  "timestamp": "",
  "intent": "",
  "active_project": "",
  "planes": {
    "chat": [],
    "graph": [],
    "artifacts": [],
    "code": [],
    "media": [],
    "deploy": [],
    "decisions": []
  },
  "open_tasks": [],
  "blocked_items": [],
  "source_of_truth": [],
  "next_prompt": ""
}
```

## NUMARA Lisp shape

```lisp
(defmode NUMARA_MEGA_CHAT_WORKSPACE
  (:purpose "shift long chat into navigable workspace/brain")
  (:planes chat graph artifact code media deploy decision)
  (:core-loop observe encode route persist render review)
  (:source-of-truth git)
  (:session-spine airtable)
  (:edge-auth cloudflare-access)
  (:rule "chat captures; workspace preserves; graph restores"))
```

## Brain handoff rule

When a chat exceeds useful scrolling length, create a handoff packet with:

1. Current project state
2. Important artifacts and locations
3. Decisions made
4. Open tasks
5. Reusable skills created
6. Deployment state
7. Next best prompt

## Anti-patterns

- Keeping critical state only in chat scrollback
- Repeating the same context manually
- Mixing client copy, code, deployment, and decisions in one block
- Creating fake frontend security when edge security exists
- Treating generated artifacts as durable before they are in Git
- Sending clients raw internal reasoning instead of a clean presentation plane

## Canonical rule

If the chat is too long to reason over, it is no longer a chat. It is a workspace waiting to be extracted.

## Operating command

"Shift this to NUMARA Brain" means:

- summarize the session
- extract structured state
- create/update durable docs
- preserve repo/artifact references
- build next-action queue
- output a compact rehydration prompt

## Mode state

Mode: NUMARA_MEGA_CHAT_WORKSPACE
Architecture: MULTI_PLANE_COCKPIT
Brain target: NUMARA_SESSION_SPINE
UI target: MEGA_CHAT_COCKPIT
Default storage: Git + Airtable/session spine + local artifact packet
Access posture: Cloudflare Access when private
Human gate: REQUIRED
