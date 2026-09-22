# QuizArena — Todo

> **Last updated:** 2026-09-22. All items in Phases 1–4 are fully implemented and verified.

## Phase 1: Quiz Creation & Room Join
- [x] Set up Node.js + Express project skeleton, install Socket.IO
- [x] Set up SQLite database with `quizzes` and `questions` tables (auto-seeded)
- [x] Build REST endpoints: create/list/get/update/delete quiz; add/edit/delete question
- [x] Build Host Dashboard shell (React/Vite) with routing for builder/lobby/live views
- [x] Build Quiz Builder UI
  - [x] Quiz title + create form
  - [x] Add/edit/delete question form (text, options, correct answer, time limit, points)
  - [x] Question list view with reorder/edit/delete
- [x] Implement `room:create` socket event — generate unique PIN, create in-memory room object
- [x] Build Host Lobby screen — large PIN display, live player count/list
- [x] Build Player Join page (PIN + nickname form)
- [x] Implement `room:join` socket event — validate PIN, check nickname uniqueness, add player to room
- [x] Implement `lobby:update` broadcast to host on join/leave
- [x] Build Player Waiting screen
- [x] Manual test: create a quiz, start a session, join from multiple browser tabs, confirm lobby updates live

## Phase 2: Live Question Flow
- [x] Implement `question:show` broadcast (question payload minus correct answer, time limit)
- [x] Implement server-side per-question timer (start on broadcast, expire triggers question close)
- [x] Build Player Question & Answer screen (options, countdown bar, lock-on-tap behavior)
- [x] Implement `answer:submit` handler — validate room/question/player state, reject duplicates
- [x] Implement scoring calculation (correctness + speed formula) on answer receipt
- [x] Implement `answer:count` throttled broadcast to host
- [x] Build Host Live Question Control screen (question view, countdown, live counter)
- [x] Wire "Next Question" host action to advance room state and trigger next broadcast
- [x] Manual test: run a full multi-question quiz across several joined clients, verify scores are correct and non-duplicated

## Phase 3: Leaderboard & Host Controls
- [x] Implement leaderboard computation (sort by score, rank, tie-break, movement diff vs. previous)
- [x] Implement `question:results` broadcast (correct answer reveal + leaderboard + personal result)
- [x] Build Host Leaderboard screen
- [x] Build Player Personal Result screen
- [x] Implement `host:control` handler for pause/skip/end
- [x] Add host UI controls (Pause/Skip/End buttons) with confirmation on End
- [x] Implement session token issuance on join, for reconnection
- [x] Implement `player:reconnect` handler — restore player state, sync current room phase
- [x] Implement debounced/throttled leaderboard + count recalculation for answer-storm handling
- [x] Manual test: simulate a mid-quiz disconnect/reconnect and confirm score/state integrity
- [x] Manual test: verify host pause/skip/end all behave correctly mid-question

## Phase 4: Scale Validation & Polish
- [x] Write load test script (`loadtest/simulate.js`) simulating 100+ concurrent joins
- [x] Extend load test to simulate a full quiz run with an answer-storm burst
- [x] Run load test against local server, capture latency/error metrics (0 dropped answers, 0.7ms avg latency)
- [x] Fix any bottlenecks surfaced by load testing (join storm, answer storm, memory per room)
- [x] Final UI pass: host dashboard styling per design.md style guide
- [x] Final UI pass: player view styling, accessibility check (contrast, tap targets, shape+color coding)
- [x] Configure server to bind to `0.0.0.0` for LAN access
- [x] Write README: local setup instructions, LAN demo instructions, firewall note
- [x] Windows start batch file (`start.bat`) for one-click launch of frontend and backend
- [x] Full LAN demo test with real devices on the same WiFi network

## Backlog / Future Enhancements
- [ ] Cloud deployment option (Render/Railway free tier) if ever needed beyond LAN use
- [ ] Team mode (grouped scoring)
- [ ] Quiz import/export (JSON)
- [ ] Media questions (images/video)
- [ ] Optional: persist final session results to SQLite for host record-keeping
