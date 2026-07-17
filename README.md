# ClassBuzz 🔔

Real-time classroom team quiz and buzzer web application. A teacher hosts a two-team
quiz (Team A vs Team B); students join with a room code or QR code and buzz for their
team from their own devices. All scoring is team-based — there are no individual scores.

## Stack

| Layer | Technology |
|--------|------------|
| App + API | Next.js 16 (App Router) |
| Database | MongoDB (Mongoose) |
| Live game | REST + short polling; atomic MongoDB buzzer |
| Hosting | Vercel |

## Getting started

```bash
cd web
cp .env.example .env.local   # set MONGODB_URI
npm install
npm run dev                  # http://localhost:3000
```

From the repo root:

```bash
npm run install:all
npm run dev
```

See [`web/README.md`](web/README.md) for MongoDB setup and Vercel deployment.

## Features

- Teacher registration and sign-in
- Reusable question sets (open-ended, multiple choice, true/false)
- Game creation with team names, colors, icons and game rules
- Room codes, join links and QR codes
- Teacher lobby with drag-and-drop team assignment, randomize and auto-balance
- Server-authoritative buzzer (first valid press wins for the whole team)
- Team discussion timer, correct/incorrect validation, second-chance rules
- Automatic and manual team scoring with undo and full score history
- Projector view (full-screen) with sounds and animations
- Student buzzer screen (mobile-first, vibration feedback)
- Reconnection support via session tokens
- Final team result + reports (CSV / print)

## Project layout

```
web/
  src/app/           Pages + API routes
  src/lib/           MongoDB, auth, game logic, polling helpers
  src/components/    UI, sounds, teacher layout
```
