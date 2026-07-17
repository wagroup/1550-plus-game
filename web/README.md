# ClassBuzz (Next.js)

Real-time classroom **Team A vs Team B** quiz and buzzer app.

Teachers host games; students buzz from their phones. Scoring is team-only.

## Stack

| Layer | Technology |
|--------|------------|
| App | Next.js 16 (App Router) |
| API | Next.js Route Handlers |
| DB | MongoDB (Mongoose) |
| Live sync | Short polling + atomic MongoDB buzzer claim |
| Deploy | Vercel |

Socket.IO was replaced with REST + ~700ms polling so the app runs on Vercel serverless. The first valid buzz still wins via an atomic `findOneAndUpdate` on the live room.

## Local development

1. Copy env and set your MongoDB URI:

```bash
cd web
cp .env.example .env.local
# edit MONGODB_URI
```

2. Install and run:

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Deploy to Vercel

1. Push this repo (or the `web/` folder as the project root).
2. In Vercel: **Import** → set **Root Directory** to `web` if the monorepo root is the repo.
3. Add environment variable:
   - `MONGODB_URI` — MongoDB Atlas connection string
4. Deploy.

### MongoDB Atlas checklist

- Create a free cluster
- Database user + password
- Network Access: allow `0.0.0.0/0` (or Vercel IPs)
- Copy the `mongodb+srv://...` URI into Vercel env

## How to play

1. Teacher: register → create a question set → Create New Game → lobby shows room code + QR
2. Students: `/join` or scan QR → name + optional team
3. Teacher: assign/balance teams → Start Game → open Projector
4. Each question: read → buzz → discuss → Correct/Incorrect → next
5. End → celebration + report under Reports

## Project layout

```
web/
  src/app/           Pages + API routes
  src/lib/           MongoDB, auth, game logic, polling helpers
  src/components/    UI, sounds, teacher layout
```

## API overview

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/auth/register` | — |
| POST | `/api/auth/login` | — |
| POST | `/api/auth/logout` | Bearer |
| GET | `/api/me` | Bearer |
| CRUD | `/api/question-sets` | Bearer |
| GET/POST | `/api/games` | Bearer |
| GET | `/api/rooms/:code` | — |
| GET | `/api/rooms/:code/state` | role query |
| POST | `/api/rooms/:code/join` | — |
| POST | `/api/rooms/:code/buzz` | sessionToken |
| POST | `/api/rooms/:code/action` | Bearer (teacher) |
| GET/DELETE | `/api/reports` | Bearer |
