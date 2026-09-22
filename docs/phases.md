# QuizArena — Phases

> **Status:** Draft | **Last updated:** 2026-09-22

## Roadmap Summary
| Phase | Name | Goal | Target duration |
|---|---|---|---|
| Phase 1 | Quiz Creation & Room Join | A host can build a quiz and players can join a live room via PIN | 2-3 days |
| Phase 2 | Live Question Flow | Host can run a full quiz round-trip: broadcast question, collect answers, score them | 3-4 days |
| Phase 3 | Leaderboard & Host Controls | Live leaderboard between questions, host pacing controls, reconnect handling | 2-3 days |
| Phase 4 | Scale Validation & Polish | Confirm 100+ concurrent players hold up under load, final UI polish | 1-2 days |

---

## Phase 1: Quiz Creation & Room Join
**Goal:** A host can create a quiz with questions and options, and players can join that quiz's room using a PIN and nickname.

**Scope:**
- Quiz CRUD (create/edit/delete quiz, add/edit/delete questions with options and correct answer)
- Local database setup (SQLite) with quiz + question schema
- Host generates a room with a random PIN, opens a "lobby" screen
- Player join screen: enter PIN + nickname, appears in host's lobby list in real time
- Basic Socket.IO room infrastructure (join/leave, room membership tracked server-side)

**Out of scope for this phase:**
- Actually running questions or scoring
- Any authentication beyond a single local host

**Deliverables:**
- Working quiz builder UI
- Working lobby: host sees players joining live, players see "waiting for host to start"

**Dependencies:** None — this is the starting point.

**Exit criteria:** A host can create a quiz, start a lobby, and 100 simulated clients (via a script) can join the same room PIN and appear in the host's live player list.

---

## Phase 2: Live Question Flow
**Goal:** A host can run a quiz start-to-finish: each question is broadcast to all players simultaneously, players answer, and answers are scored correctly server-side.

**Scope:**
- Server-authoritative question broadcast (`question:show` event with options + timer duration)
- Player answer submission (`answer:submit`) with server-side validation and idempotent handling (no double-counting on resubmit)
- Server-side timer per question (not client-trusted)
- Speed + correctness based scoring formula, computed on answer arrival
- Live "N of 100 answered" counter shown to host

**Out of scope for this phase:**
- Leaderboard UI (raw scores only, no ranking display yet)
- Host pause/skip controls

**Deliverables:**
- End-to-end flow: host clicks "next question" → all joined clients receive it near-simultaneously → answers are collected and scored

**Dependencies:** Phase 1's room/lobby infrastructure.

**Exit criteria:** Running a 5-question quiz with 100 simulated clients produces correct, non-duplicated scores for every player, with no missed broadcasts.

---

## Phase 3: Leaderboard & Host Controls
**Goal:** The quiz feels like a real live event — ranked leaderboard between rounds, host has pacing control, and dropped connections don't break the game.

**Scope:**
- Leaderboard screen shown to host (and optionally players) after each question, ranked by cumulative score
- Host controls: pause, skip question, end quiz early
- Reconnection handling: a player whose socket drops can rejoin the same room/PIN without losing their score
- Answer-storm handling: throttle/batch leaderboard recalculation instead of recomputing per answer

**Out of scope for this phase:**
- Load testing (that's Phase 4)
- Visual polish/animations beyond functional clarity

**Deliverables:**
- Full leaderboard between every question
- Host control panel (pause/skip/end)
- Verified reconnect flow

**Dependencies:** Phase 2's scoring pipeline.

**Exit criteria:** A full quiz can run with a mid-game simulated disconnect/reconnect and the game state stays correct; leaderboard updates without visibly lagging the host UI.

---

## Phase 4: Scale Validation & Polish
**Goal:** Confirm the app actually holds up with 100+ concurrent participants and is presentable for a live demo.

**Scope:**
- Artillery (or socket.io-client script) load test simulating 100+ concurrent players joining, answering in a burst, and receiving results
- Fix any bottlenecks found (join storm handling, answer storm handling, memory per room)
- Final UI pass: host dashboard, player mobile view, join screen
- Local network demo path documented (host machine IP + port, all devices on same WiFi)

**Out of scope for this phase:**
- Any cloud deployment or hosting setup (explicitly out of scope for this project)
- Multi-room-at-once stress testing (single active event is the target use case)

**Deliverables:**
- Load test script + results showing 100+ concurrent players handled correctly
- Polished, demo-ready UI
- Short README on running the app locally and demoing over LAN

**Dependencies:** Phases 1-3 complete and functionally correct.

**Exit criteria:** Load test passes with 100+ simulated clients with no dropped/duplicated answers and acceptable latency (<500ms question broadcast to all clients); a live LAN demo with real devices works end-to-end.

---

## Future / Not Yet Scheduled
- Cloud deployment (Render/Railway free tiers) if the project later needs to go beyond LAN demos
- Team mode (players grouped into teams with combined scores)
- Quiz import/export (JSON) for sharing quizzes between hosts
- Media questions (images/video embedded in questions)
