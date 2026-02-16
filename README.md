# CollabBoard

Real-time collaborative whiteboard built with Next.js, tldraw, Yjs, and PartyKit.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| Canvas | tldraw v2 |
| Real-Time Sync | Yjs (CRDT) + PartyKit (Cloudflare Workers) |
| Authentication | NextAuth.js (Google + GitHub OAuth) |
| Database | Firebase Firestore |
| Deployment | Vercel (app) + PartyKit/Cloudflare (sync server) |

## MVP Features

- [x] Infinite board with pan/zoom
- [x] Sticky notes with editable text
- [x] Shapes (rectangle, circle, line, arrow)
- [x] Create, move, and edit objects
- [x] Real-time sync between 2+ users
- [x] Multiplayer cursors with name labels
- [x] Presence awareness (who's online)
- [x] User authentication (Google/GitHub OAuth)
- [x] Deployed and publicly accessible

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
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

### 3. Run development server

```bash
npm run dev
```

This starts both Next.js (port 3000) and PartyKit (port 1999) concurrently.

Open http://localhost:3000 — sign in, create a board, and share the URL with another user to collaborate in real-time.

## Architecture

```
src/
  app/                    # Next.js App Router pages
    board/[id]/           # Board page with tldraw + PartyKit sync
    dashboard/            # Board listing and management
    api/
      auth/[...nextauth]/ # NextAuth.js route handler
      boards/             # Board CRUD API
  components/
    board/                # Board-specific components
      CollaborativeBoard  # Main whiteboard (tldraw + Yjs sync)
      LiveCursors         # Multiplayer cursor overlay (Yjs awareness)
      PresenceAvatars     # Who's online indicator (Yjs awareness)
  lib/
    auth.ts               # NextAuth configuration
    firebase.ts            # Firebase Admin SDK + Firestore singleton
    userColors.ts         # Deterministic user color assignment
    useYjsStore.ts        # tldraw <-> PartyKit Yjs sync hook
    useAwareness.ts       # Yjs awareness hook (cursors + presence)
    AwarenessContext.tsx   # React context for awareness data
party/
  index.ts                # PartyKit server (Yjs sync + persistence)
partykit.json             # PartyKit configuration
```

## How Real-Time Sync Works

1. Each board maps to a PartyKit "room" running on Cloudflare Workers
2. The PartyKit server uses `y-partykit` to sync a Yjs document across all connected clients
3. The Yjs document contains a `Y.Map("tl_")` that mirrors tldraw's store
4. `useYjsStore` hook bidirectionally syncs tldraw's TLStore with the Yjs map
5. Cursor positions and presence are broadcast via the Yjs awareness protocol
6. Board state persists in Cloudflare Durable Object storage (survives all users disconnecting)

## Deployment

### 1. Deploy PartyKit server

```bash
npx partykit deploy
```

Note the URL (e.g., `collabboard.your-username.partykit.dev`).

### 2. Deploy Next.js to Vercel

```bash
npm i -g vercel
vercel
```

Set these environment variables in Vercel dashboard:
- All the vars from `.env.example`
- `NEXT_PUBLIC_PARTYKIT_HOST` = your PartyKit URL from step 1

Then:

```bash
vercel --prod
```

Update `NEXTAUTH_URL` to your production URL and update OAuth redirect URIs accordingly.
