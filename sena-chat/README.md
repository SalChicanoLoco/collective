# Sena Chat — Clojure × Claude

A terminal chat application backed by the Anthropic Claude API.  
Conversations are stored as a **persistent immutable directed graph** using Clojure's native data structures and serialised to EDN on every turn.

## Prerequisites

| Tool | Version |
|------|---------|
| Java | 11 + |
| Clojure CLI | 1.11 + |

Export your Anthropic API key before running:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

## Run

```bash
cd sena-chat
clj -M:run
```

Or with Leiningen (requires a `project.clj` — see below):

```bash
lein run
```

## What you get at startup

```
╔══════════════════════════════════════╗
║   Sena Chat  ·  Clojure × Claude     ║
╚══════════════════════════════════════╝
  /voice <aria|nova|vex|grant>  — switch persona
  /quit                          — exit

Available sessions:
  [0] 20240426-143022
  [n] Start new session
Choose:
```

Existing sessions are listed and can be resumed. Choosing `n` starts fresh.

## In-session commands

| Command | Effect |
|---------|--------|
| `/voice aria` | Switch to Aria (warm teacher) |
| `/voice nova` | Switch to Nova (strategic PM) |
| `/voice vex`  | Switch to Vex (precise R&D) |
| `/voice grant`| Switch to Grant (storytelling) |
| `/quit`       | Exit the REPL |

Any other input is sent to Claude under the active voice persona.

## Bilingual support

Write in English or Spanish — the active persona replies in whatever language you use. No translation layer; the content is passed through as-is.

## Graph model

Every message is a node; every reply is a `:reply-to` edge; every voice switch is a `:voice-switch` edge.

```clojure
{:graph
  {:nodes {"msg-0001" {:id "msg-0001" :role :user   :content "Hola"
                        :timestamp "2024-04-26T14:30:22Z" :voice :aria}
           "msg-0002" {:id "msg-0002" :role :assistant :content "¡Hola! …"
                        :timestamp "2024-04-26T14:30:23Z" :voice :aria
                        :parent "msg-0001"}}
   :edges [{:id "rel-0001" :type :reply-to
             :source "msg-0002" :target "msg-0001"}]
   :root "msg-0001"
   :active-voice :aria}
 :meta {:msg-counter 2 :rel-counter 1 :version 2 :session-id "20240426-143022"}}
```

## Session persistence

Sessions live in `./sessions/`:

```
sessions/
  20240426-143022.edn       ← current (overwritten each turn)
  20240426-143022_v1.edn    ← immutable snapshot after turn 1
  20240426-143022_v2.edn    ← immutable snapshot after turn 2
  …
```

Snapshots are never overwritten.

## Namespace structure

| Namespace | Role |
|-----------|------|
| `sena.chat.core`    | Entry point, REPL loop, command dispatch (Phase 1) |
| `sena.chat.server`  | Ring/Compojure HTTP server (Phase 2) |
| `sena.chat.graph`   | Pure graph operations (no I/O) |
| `sena.chat.api`     | Anthropic HTTP call (clj-http) |
| `sena.chat.voices`  | Persona system-prompt strings |
| `sena.chat.session` | EDN serialise / deserialise |

---

## Phase 2 — HTTP API

Start the JSON server (default port 3000, override with `PORT`):

```bash
cd sena-chat
ANTHROPIC_API_KEY=sk-ant-... clj -M:serve
# or: PORT=8080 clj -M:serve
```

The server and the terminal REPL share the same `./sessions/` directory on disk — sessions started in one mode are visible to the other.

### Endpoints

| Method | Path | Body | Description |
|--------|------|------|-------------|
| `POST` | `/api/sessions` | — | Create a new session |
| `GET`  | `/api/sessions` | — | List all sessions |
| `GET`  | `/api/sessions/:id` | — | Full graph for a session |
| `POST` | `/api/sessions/:id/messages` | `{"content":"…"}` | Send a message, get reply |
| `PUT`  | `/api/sessions/:id/voice` | `{"voice":"nova"}` | Switch persona |

All responses and request bodies are JSON.

### Example curl session

```bash
# 1. Create a session
SID=$(curl -sX POST http://localhost:3000/api/sessions | jq -r .session_id)

# 2. Chat
curl -sX POST http://localhost:3000/api/sessions/$SID/messages \
  -H 'Content-Type: application/json' \
  -d '{"content":"Explain recursion simply"}' | jq .

# 3. Switch to the strategic PM voice
curl -sX PUT http://localhost:3000/api/sessions/$SID/voice \
  -H 'Content-Type: application/json' \
  -d '{"voice":"nova"}' | jq .

# 4. Continue — Nova answers in the same graph
curl -sX POST http://localhost:3000/api/sessions/$SID/messages \
  -H 'Content-Type: application/json' \
  -d '{"content":"What is the product impact of this?"}' | jq .

# 5. Inspect the full graph
curl -s http://localhost:3000/api/sessions/$SID | jq .
```

### Response shapes

**POST /api/sessions** → 201
```json
{"session_id":"20240426-143022","active_voice":"aria","node_count":0,"edge_count":0,"version":1}
```

**POST /api/sessions/:id/messages** → 200
```json
{
  "user":      {"id":"msg-0001","role":"user","content":"…","timestamp":"…","voice":"aria"},
  "assistant": {"id":"msg-0002","role":"assistant","content":"…","timestamp":"…","voice":"aria","parent":"msg-0001"},
  "summary":   {"node_count":2,"edge_count":1,"active_voice":"aria","session_id":"…","version":2}
}
```

**PUT /api/sessions/:id/voice** → 200
```json
{"active_voice":"nova","summary":{"node_count":2,"edge_count":2,"active_voice":"nova","version":3}}
```

---

## Leiningen project.clj (optional)

If you prefer `lein run`, add this file at `sena-chat/project.clj`:

```clojure
(defproject sena-chat "0.1.0"
  :dependencies [[org.clojure/clojure       "1.12.0"]
                 [clj-http/clj-http         "3.13.0"]
                 [cheshire/cheshire         "5.13.0"]
                 [org.clojure/data.json     "2.5.0"]
                 [ring/ring-core            "1.12.1"]
                 [ring/ring-jetty-adapter   "1.12.1"]
                 [compojure/compojure       "1.7.1"]
                 [ring/ring-json            "0.5.1"]]
  :main sena.chat.core      ; or sena.chat.server for HTTP mode
  :source-paths ["src"])
```
