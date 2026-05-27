# NUMARA LispCompress Mode

## Slash command

`/LispCompress`

## Purpose

Compress long chats, working sessions, or project threads into a symbolic ledger plus reference graph that can be rehydrated later by NUMARA Core, another model, or the Mega Chat Workspace.

## Prior lineage

This mode formalizes the earlier NUMARA memory compactor pattern:

- ingest chat/export text
- chunk and classify atoms
- dedupe repeated context
- assign atoms into NUMARA graph nodes
- emit memory capsules
- emit Lisp-like rehydration grammar
- preserve a compact next-agent prompt

## Core rule

Raw chat is not memory. Raw chat is a capture stream. Memory begins when state is compressed into symbols, edges, decisions, and rehydration instructions.

## Output layers

1. Symbolic ledger
2. Reference graph
3. Decision ledger
4. Artifact index
5. Source-of-truth pointers
6. Open task queue
7. Rehydration prompt
8. Compression metrics

## Compression strategy

### Keep

- project identity
- decisions
- constraints
- artifacts
- commits
- domains
- people/emails when relevant
- failure lessons
- next action queue
- reusable skills/modes

### Drop

- repeated affirmations
- dead-end UI attempts
- duplicated explanations
- transient wording
- failed implementation details unless they affect future safety
- unneeded emotional filler

### Preserve as edge pressure

Failed attempts are not copied verbatim. They become compressed edges such as:

```lisp
(edge fake-frontend-auth cloudflare-access
  :relation rejected_for_real_edge_auth
  :lesson "Use what we have. Why fake it when we have the Cloudflare API?")
```

## Canonical Lisp shape

```lisp
(defcompress /LispCompress
  (:input current-chat | pasted-export | file)
  (:emit symbolic-ledger reference-graph decision-log artifact-index rehydrate-prompt metrics)
  (:graph-primitives P0 P1 P2 P3 P4 P5 P6 P7)
  (:storage git airtable local-json canvas)
  (:rule "capture stream becomes symbolic memory")
  (:human-review required))
```

## Symbolic ledger template

```lisp
(defledger SESSION_ID
  (:meta
    (:mode /LispCompress)
    (:source current-chat)
    (:project "")
    (:timestamp "")
    (:compression "symbolic-ledger+reference-graph"))

  (:atoms
    (A0 :type project :label "")
    (A1 :type decision :label "")
    (A2 :type artifact :label "")
    (A3 :type risk :label "")
    (A4 :type next-action :label ""))

  (:edges
    (E0 A0 A1 :rel decided)
    (E1 A1 A2 :rel produced)
    (E2 A2 A4 :rel enables))

  (:rehydrate
    (:prompt "Continue from this compressed NUMARA ledger...")))
```

## Reference graph template

```lisp
(defgraph SESSION_REF_GRAPH
  (:nodes
    (N0 :kind project)
    (N1 :kind decision)
    (N2 :kind artifact)
    (N3 :kind deploy)
    (N4 :kind skill)
    (N5 :kind open-task))
  (:edges
    (N0 -> N1 :why "decision pressure")
    (N1 -> N2 :why "artifact created")
    (N2 -> N3 :why "deploy target")
    (N1 -> N4 :why "lesson promoted to skill")
    (N3 -> N5 :why "remaining work")))
```

## Compression metrics

Always report:

- raw estimate or exact raw bytes if export is available
- compressed character count
- estimated savings percentage
- caveat if source was not byte-exact

Formula:

```text
saved_percent = 100 * (1 - compressed_size / raw_size)
```

## Slash behavior

When user says `/LispCompress`, produce:

1. A compact Lisp ledger
2. A compact reference graph
3. A savings estimate
4. A rehydration prompt
5. Optional Git/Airtable/canvas update if requested

## Anti-patterns

- Claiming exact compression without exact input bytes
- Preserving every message verbatim
- Losing commit IDs or artifact paths
- Hiding failed decisions that shaped the current architecture
- Treating summarized prose as durable memory without a rehydration prompt

## Mode state

Mode: LISP_COMPRESS
Command: /LispCompress
Input: current chat or pasted export
Output: symbolic ledger + reference graph
Primary target: NUMARA Brain
Secondary target: Mega Chat Workspace import
Storage: Git/Airtable/local JSON
Human gate: REQUIRED
