# CollabBoard

Real-time collaborative whiteboard with AI-powered agents built with Next.js, tldraw, Yjs, and PartyKit.

<img width="1472" height="838" alt="Screenshot 2026-02-20 at 8 05 35 PM" src="https://github.com/user-attachments/assets/d4c22ccd-622c-44d6-9737-bdf08309de8d" />
<img width="1366" height="822" alt="Screenshot 2026-02-20 at 7 18 58 PM" src="https://github.com/user-attachments/assets/af3f94e0-7e4e-480d-a828-6e3d26c863a3" />
<img width="1470" height="820" alt="Screenshot 2026-02-20 at 8 05 05 PM" src="https://github.com/user-attachments/assets/958f5159-752b-4698-a8db-99c633025d13" />


## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | [Next.js](https://nextjs.org/) (App Router) | 14.2.21 |
| Language | [TypeScript](https://www.typescriptlang.org/) | 5.6 |
| UI / Styling | [Tailwind CSS](https://tailwindcss.com/) | 3.4.17 |
| Canvas / Whiteboard | [tldraw](https://tldraw.dev/) | 2.4.0 |
| Real-Time Sync (CRDT) | [Yjs](https://yjs.dev/) | 13.6.0 |
| WebSocket Server | [PartyKit](https://www.partykit.io/) (Cloudflare Workers) | 0.0.111 |
| PartyKit Yjs Adapter | [y-partykit](https://github.com/partykit/y-partykit) | 0.0.25 |
| Authentication | [NextAuth.js](https://next-auth.js.org/) (Google + GitHub OAuth) | 4.24.11 |
| Database / Auth Adapter | [Firebase Admin SDK](https://firebase.google.com/) + Firestore | 13.0.0 |
| Client-Side Firebase | [Firebase JS SDK](https://firebase.google.com/) | 11.2.0 |
| AI — Command Bar | [LangChain](https://js.langchain.com/) + [OpenAI GPT-4o-mini](https://platform.openai.com/) | — |
| AI — Multi-Agent | [Anthropic Claude Haiku 4.5](https://docs.anthropic.com/) | — |
| Observability | [Langfuse](https://langfuse.com/) | — |
| Deployment | [Firebase App Hosting](https://firebase.google.com/docs/app-hosting) (Cloud Run) + [PartyKit / Cloudflare](https://www.partykit.io/) | — |

## Features

### Canvas & Drawing
- Infinite board with pan/zoom
- Sticky notes with editable text
- Shapes (rectangle, circle, line, arrow, diamond, star)
- Frames, connectors, text labels
- Full tldraw toolbar (select, draw, erase, shapes, text, etc.)

### Real-Time Collaboration
- Real-time sync between 2+ users via Yjs CRDT
- Multiplayer cursors with name labels and user colors
- Presence awareness (who's online, avatar indicators at top-center)
- Deterministic color assignment per user (10-color palette)
- Board state persists in Cloudflare Durable Object storage

### Dashboard
- Personal dashboard with board listing
- Board preview thumbnails (auto-captured snapshots)
- Collaborator avatars showing who edited each board
- Create and delete boards
- Protected routes (redirect to sign-in if unauthenticated)

### Navigation & Sharing
- Persistent header on boards (logo, back to dashboard, user info, sign out)
- Share dropdown: copy link, share on X (Twitter), share on LinkedIn
- Invite Agent button for external bot integration

## AI Command Bar

Natural language command bar (Cmd+K) powered by OpenAI GPT-4o-mini that processes prompts and returns structured board actions.

### Architecture

```
User Prompt + Board State → LangChain/OpenAI (GPT-4o-mini, JSON mode) → Zod-validated Actions → tldraw Editor → Yjs Sync
```

### 13 Supported Action Types

| Category | Actions |
|----------|---------|
| Creation | `create_sticky`, `create_multiple_stickies`, `create_text`, `create_shape`, `create_connector`, `create_arrow`, `create_frame` |
| Manipulation | `move_shapes`, `resize_object`, `update_text`, `change_color` |
| Analysis | `summarize_board`, `group_items` |

### Observability

- **Langfuse** tracing on every LLM call — cost, latency, token usage
- **Zod** runtime schema validation with 25+ type aliases for LLM output normalization

## Multi-Agent Visual Collaboration

Independent from the Command Bar, CollabBoard features a multi-agent system where AI personalities visually collaborate on the board in real-time.

### How It Works

1. Open the Agent Panel (Cmd+Shift+K or click the sparkle button)
2. Select one or more agent personalities
3. Type a prompt or pick a quick prompt ("Brainstorm ideas", "Organize the board", etc.)
4. Agents appear as live users — their avatar cursors glide across the canvas as they place stickies, shapes, frames, and arrows

### Three Built-In Personalities

| Personality | Style | Color |
|------------|-------|-------|
| **The Analyst** | Structured, data-driven. Uses frames and grids to organize ideas systematically | Blue |
| **The Creative** | Divergent, playful. Generates many colorful stickies with unexpected connections | Pink |
| **The Critic** | Challenging, thorough. Questions assumptions and identifies weaknesses | Red |

Each personality has a custom 3D avatar that appears in the presence bar and as an animated cursor on the canvas.

### Agent Simulation

When agents work, you see them as real users:

- Agent avatars appear in the top-center presence bar
- Animated cursors with agent avatars glide smoothly (400ms ease-out) to each target position
- Shapes appear one-by-one as each cursor arrives at its location
- Multiple agents work in parallel across different areas of the board
- Agents fade out after completing their work

### External Bot / Agent API

Any external bot can join a board and add content via the REST API:

1. Click **"Invite Agent"** in the board header
2. Name the bot and get an API key (`cb_bot_...`)
3. The bot POSTs actions to `/api/agents/bot-action`:

```bash
curl -X POST https://your-app.com/api/agents/bot-action \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer cb_bot_your_key_here" \
  -d '{
    "boardId": "your-board-id",
    "actions": [
      {
        "type": "create_sticky",
        "text": "Hello from my bot!",
        "position": { "x": 100, "y": 100 },
        "color": "violet"
      }
    ]
  }'
```

Actions are queued in Firestore and automatically picked up by any connected client within 3 seconds.

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in your credentials:

**Firebase** (https://console.firebase.google.com)
- Create a project, enable Firestore
- Go to Project Settings > Service Accounts > Generate New Private Key
- Option 1: Set `FIREBASE_SERVICE_ACCOUNT_KEY` to the stringified JSON
- Option 2: Set individual vars (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`)

**NextAuth**
- Generate secret: `openssl rand -base64 32`
- Set `NEXTAUTH_URL=http://localhost:3000`

**Google OAuth** (https://console.cloud.google.com/apis/credentials)
- Create OAuth 2.0 credentials
- Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

**GitHub OAuth** (https://github.com/settings/developers)
- Create OAuth App
- Authorization callback URL: `http://localhost:3000/api/auth/callback/github`

**OpenAI** (for Command Bar AI)
- Set `OPENAI_API_KEY` from https://platform.openai.com/api-keys

**Anthropic** (for Multi-Agent system)
- Set `ANTHROPIC_API_KEY` from https://console.anthropic.com

### 3. Run development server

```bash
npm run dev
```

This starts both Next.js (port 3000) and PartyKit (port 1999) concurrently.

Open http://localhost:3000 — sign in, create a board, and share the URL with another user to collaborate in real-time.

## Architecture

```
src/
  app/                        # Next.js App Router pages
    board/[id]/               # Board page with tldraw + PartyKit sync
    dashboard/                # Board listing with thumbnails + collaborators
    api/
      auth/[...nextauth]/     # NextAuth.js route handler
      boards/                 # Board CRUD + snapshot + collaborators API
      ai/command/             # Command Bar AI endpoint (OpenAI)
      agents/
        start/                # Multi-agent start endpoint (Claude)
        bots/                 # Bot invite CRUD (create key, list bots)
        bot-action/           # External bot action endpoint + poll
  components/
    board/
      BoardHeader             # Nav bar with share dropdown + invite agent
      CollaborativeBoard      # Main whiteboard (tldraw + Yjs + hooks)
      LiveCursors             # Multiplayer + agent cursor overlay
      PresenceAvatars         # Who's online (users + agents)
      CommandBar/             # AI command bar (Cmd+K)
      AgentPanel/             # Multi-agent panel (Cmd+Shift+K)
        PersonalityCard       # Agent personality selector card
      AiActivityIndicator     # Sparkle indicator for AI activity
  lib/
    auth.ts                   # NextAuth configuration
    firebase.ts               # Firebase Admin SDK + Firestore
    userColors.ts             # Deterministic user color assignment
    useYjsStore.ts            # tldraw ↔ PartyKit Yjs sync hook
    useAwareness.ts           # Yjs awareness hook (cursors + presence)
    AwarenessContext.tsx       # Awareness context (real + simulated agents)
    ai/
      agent.ts                # OpenAI agent runner (Command Bar)
      claude-agent.ts         # Claude agent runner (Multi-Agent)
      tools.ts                # Board action Zod schemas (13 types)
      constants.ts            # Type aliases, layout defaults
      personalities.ts        # 3 agent personality definitions
      executeActions.ts       # Client-side action executor
    agents/
      AgentSession.ts         # Server-side agent lifecycle (Yjs)
      executeActionsViaYjs.ts # Server-side Yjs action executor
      botAuth.ts              # Bot API key generation + verification
    hooks/
      useSnapshotCapture.ts   # Board thumbnail capture
      useCollaboratorTracker.ts # Edit tracking per user
      useAgentSimulation.ts   # Agent cursor animation + presence
      useBotActionListener.ts # External bot action polling
party/
  index.ts                    # PartyKit server (Yjs sync + persistence)
partykit.json                 # PartyKit configuration
apphosting.yaml               # Firebase App Hosting (secrets + env vars)
```

## How Real-Time Sync Works

1. Each board maps to a PartyKit "room" running on Cloudflare Workers
2. The PartyKit server uses `y-partykit` to sync a Yjs document across all connected clients
3. The Yjs document contains a `Y.Map("tl_")` that mirrors tldraw's store
4. `useYjsStore` hook bidirectionally syncs tldraw's TLStore with the Yjs map
5. Cursor positions and presence are broadcast via the Yjs awareness protocol
6. Board state persists in Cloudflare Durable Object storage (survives all users disconnecting)

## Performance Metrics

Performance benchmarks are validated via `npm run test:perf` (Vitest). All targets measured on Node.js with simulated board state.

### Canvas & Serialization

| Benchmark | Target | Description |
|-----------|--------|-------------|
| 500 shapes serialization | < 50ms | Map + round all shapes to API-ready JSON |
| 1,000 shapes serialization | < 100ms | Same at 2× scale |
| JSON stringify (500 shapes) | < 20ms | Full `JSON.stringify` for network/storage |
| Board state payload (500 shapes) | < 100 KB | JSON size for 500-shape board |
| AI request payload (100 shapes) | < 20 KB | Prompt + board context sent to LLM |

### Real-Time Sync (Yjs CRDT)

| Benchmark | Target | Description |
|-----------|--------|-------------|
| Create 500 shapes in Y.Doc | < 100ms | Single transaction batch insert |
| Encode state vector (500 shapes) | < 10ms | Yjs `encodeStateVector` for diffing |
| Incremental sync between 2 docs | < 5ms | Encode delta + apply update |
| 5-user concurrent sync (50 shapes) | < 50ms | Star-topology merge, all docs converge |

### AI Agent Performance

| Benchmark | Target | Description |
|-----------|--------|-------------|
| Zod validation of 50 actions | < 10ms | `BoardActionSchema` discriminated union parse |
| Type normalization (50 actions) | < 1ms | Alias map lookup for LLM type drift |
| Color normalization | < 1ms | 15+ alias map for invalid LLM colors |
| Agent cursor animation frame | 400ms | Smooth ease-out glide per action |
| Agent response (Claude Haiku 4.5) | < 5s | End-to-end prompt → structured actions |
| Command Bar response (GPT-4o-mini) | < 3s | End-to-end prompt → board actions |

### Network & Payload

| Metric | Value |
|--------|-------|
| WebSocket reconnect | Automatic (Yjs provider) |
| Bot action poll interval | 3 seconds |
| Awareness broadcast | ~50ms (Yjs awareness protocol) |
| Max actions per bot request | 50 |
| Max bot rate limit | 30 requests/minute |

## Testing

```bash
npm test              # Run all tests
npm run test:ai       # AI agent tests only
npm run test:perf     # Performance benchmarks only
npm run test:coverage # Coverage report (70%+ thresholds)
```

6 test files with 50+ test cases covering unit, integration, and performance benchmarks.

## Deployment

### Firebase App Hosting (Production)

The app deploys to Firebase App Hosting (Cloud Run). Secrets are managed via Google Cloud Secret Manager:

```bash
# Set secrets
firebase apphosting:secrets:set OPENAI_API_KEY --backend collab
firebase apphosting:secrets:set ANTHROPIC_API_KEY --backend collab

# Grant access
firebase apphosting:secrets:grantaccess OPENAI_API_KEY --backend collab
firebase apphosting:secrets:grantaccess ANTHROPIC_API_KEY --backend collab
```

Environment variables are configured in `apphosting.yaml`.

### PartyKit

```bash
npx partykit deploy
```

Note the URL (e.g., `collabboard.your-username.partykit.dev`) and set it as `NEXT_PUBLIC_PARTYKIT_HOST`.

### AI Development Log

See [`AI_Development_Log.pdf`](AI_Development_Log.pdf) or [`AI_Development_Log.md`](AI_Development_Log.md) for the full AI development log including tools & workflow, effective prompts, code analysis breakdown, and production cost projections.
