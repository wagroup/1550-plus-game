# ClassBuzz 🔔

Real-time classroom team quiz and buzzer web application. A teacher hosts a two-team
quiz (Team A vs Team B); students join with a room code or QR code and buzz for their
team from their own devices. All scoring is team-based — there are no individual scores.

## Features (MVP)

- Teacher registration and sign-in
- Reusable question sets (open-ended, multiple choice, true/false)
- Game creation with team names, colors, icons and game rules
- Room codes, join links and QR codes
- Teacher lobby with drag-and-drop team assignment, randomize and auto-balance
- Server-authoritative real-time buzzer (first valid press wins for the whole team)
- Team discussion timer, correct/incorrect validation, second-chance rules
- Automatic and manual team scoring with undo and full score history
- Projector view (full-screen, 16:9 friendly) with sounds and animations
- Student buzzer screen (mobile-first, huge buzzer button, vibration feedback)
- Pause/resume, skip, restart question, buzzer reset
- Reconnection support for students and the teacher (session tokens)
- Final team result with celebration + team-based game reports (CSV / print export)

## Tech stack

| Layer      | Technology |
|------------|------------|
| Frontend   | React 18, TypeScript, Vite, Tailwind CSS 4, React Router |
| Real-time  | Socket.IO |
| Backend    | Node.js, Express |
| Storage    | JSON files on disk (`server/data/`) — an MVP stand-in for PostgreSQL/Redis |

The buzzer lock is atomic because all game state lives in the single-threaded Node
process: the first `buzzer:press` request to reach the server wins and every later
press is rejected (equivalent to the `SET ... NX` Redis pattern in the PRD).

## Getting started

Requires Node.js 18+.

```bash
npm run install:all   # installs root, server and client dependencies
npm run dev           # starts server (:3001) and client (:5173) together
```

Open http://localhost:5173

### Production build

```bash
npm run build   # builds the client into client/dist
npm start       # Express serves the API, websockets AND the built client on :3001
```

## How to play

1. **Teacher**: create an account → create a question set → Create New Game →
   configure teams and rules → the room code + QR appear in the lobby.
2. **Students**: open the site (or scan the QR), enter the room code and a name,
   pick a team (if enabled).
3. **Teacher**: assign/balance teams, open the projector view on the big screen,
   press **Start Game**.
4. Each question: students read → buzzer opens → first press wins the chance for
   the whole team → team discusses → teacher marks Correct/Incorrect → next question.
5. After the last question the winning **team** is celebrated on every screen and a
   full team report is saved under **Reports**.

## Project structure

```
server/
  src/index.js    Express + Socket.IO wiring, REST API
  src/game.js     GameRoom state machine (buzzer, scoring, rounds, reports)
  src/auth.js     Password hashing + session tokens
  src/store.js    JSON persistence
  data/           Created at runtime (teachers, question sets, games, reports)
client/
  src/pages/      Landing, Login, Register, Dashboard, QuestionSets, CreateGame,
                  Host (lobby + live control), Projector, Join, Play, Reports
  src/components/ Shared UI, sounds, teacher layout
```
