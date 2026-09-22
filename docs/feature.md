# QuizArena — Feature List

> **Status:** Draft | **Last updated:** 2026-09-22

## Feature Summary
| # | Feature | Category | Phase | Priority | Status |
|---|---|---|---|---|---|
| 1 | Quiz builder (CRUD) | Quiz Management | Phase 1 | Must-have | Planned |
| 2 | Room creation & PIN generation | Session/Lobby | Phase 1 | Must-have | Planned |
| 3 | Player join via PIN + nickname | Session/Lobby | Phase 1 | Must-have | Planned |
| 4 | Live lobby player list | Session/Lobby | Phase 1 | Must-have | Planned |
| 5 | Question broadcast | Live Quiz Flow | Phase 2 | Must-have | Planned |
| 6 | Answer submission & validation | Live Quiz Flow | Phase 2 | Must-have | Planned |
| 7 | Server-side timer | Live Quiz Flow | Phase 2 | Must-have | Planned |
| 8 | Speed-based scoring | Live Quiz Flow | Phase 2 | Must-have | Planned |
| 9 | Live answer-count indicator | Live Quiz Flow | Phase 2 | Should-have | Planned |
| 10 | Ranked leaderboard | Results | Phase 3 | Must-have | Planned |
| 11 | Host controls (pause/skip/end) | Host Tools | Phase 3 | Must-have | Planned |
| 12 | Reconnection handling | Reliability | Phase 3 | Must-have | Planned |
| 13 | Answer-storm throttling | Reliability | Phase 3 | Should-have | Planned |
| 14 | Load test suite | Validation | Phase 4 | Must-have | Planned |
| 15 | LAN demo mode | Deployment (local) | Phase 4 | Must-have | Planned |

*Priority: Must-have / Should-have / Nice-to-have. Status: Planned / In progress / Done.*

---

## 1. Quiz Builder (CRUD)
**Category:** Quiz Management
**Phase:** Phase 1
**Priority:** Must-have

**What it does:**
Lets a host create a quiz made of multiple-choice questions, each with 2-4 options, a correct answer, points value, and time limit.

**User story:**
As a host, I want to build a quiz with my own questions, so that I can run a session tailored to my event.

**How it works:**
1. Trigger: Host clicks "Create Quiz" on the dashboard.
2. Logic: Host enters a quiz title, then adds questions one at a time (question text, options, correct option index, time limit in seconds, points value). Each save writes to the local database.
3. Result: Quiz appears in the host's quiz library, ready to be launched into a live room.

**Inputs:** Quiz title, question text, option list, correct answer index, time limit, point value.

**Outputs:** A quiz record (with nested questions) persisted in the database.

**Edge cases & error handling:**
- Edge case: Question with fewer than 2 options → blocked by client-side validation, save disabled.
- Edge case: No correct answer selected → blocked by validation.
- Error case: DB write fails → show inline error, don't lose entered text (keep in local form state).

**Dependencies:** Local database (SQLite).

---

## 2. Room Creation & PIN Generation
**Category:** Session/Lobby
**Phase:** Phase 1
**Priority:** Must-have

**What it does:**
When a host starts a saved quiz, the server generates a short numeric PIN and opens a live Socket.IO room tied to that PIN.

**User story:**
As a host, I want a simple code my audience can use to join, so that starting a live session doesn't require accounts or links.

**How it works:**
1. Trigger: Host clicks "Start Session" on a quiz.
2. Logic: Server generates a random N-digit PIN not currently in use, creates an in-memory room object (quiz reference, empty player list, state = "lobby"), and returns the PIN to the host.
3. Result: Host sees the PIN displayed large on screen, ready to share.

**Inputs:** Quiz ID being launched.

**Outputs:** A new in-memory room keyed by PIN.

**Edge cases & error handling:**
- Edge case: PIN collision with an active room → regenerate until unique.
- Edge case: Host closes tab mid-lobby → room is torn down after a grace period with no host socket connected.

**Dependencies:** Feature 1 (a quiz must exist to launch).

---

## 3. Player Join via PIN + Nickname
**Category:** Session/Lobby
**Phase:** Phase 1
**Priority:** Must-have

**What it does:**
Lets any player join a live room by entering the host's PIN and a nickname, with no account or app install required.

**User story:**
As a participant, I want to join instantly with just a code and my name, so that I can start playing within seconds of the host announcing the PIN.

**How it works:**
1. Trigger: Player opens the join page (on their own device) and enters the PIN + a nickname.
2. Logic: Server checks the PIN maps to an active lobby-state room, checks nickname isn't already taken in that room, adds the player's socket to the room.
3. Result: Player sees a "waiting for host to start" screen; host's lobby list updates in real time.

**Inputs:** PIN, nickname.

**Outputs:** Player added to the room's player list; broadcast to host.

**Edge cases & error handling:**
- Edge case: Invalid/expired PIN → clear error message, stay on join screen.
- Edge case: Duplicate nickname in the same room → prompt for a different one.
- Edge case: Room already mid-quiz (not in lobby state) → block join with "quiz already started" message.

**Dependencies:** Feature 2.

---

## 4. Live Lobby Player List
**Category:** Session/Lobby
**Phase:** Phase 1
**Priority:** Must-have

**What it does:**
Shows the host a live-updating list (and count) of everyone who has joined the room before the quiz starts.

**User story:**
As a host, I want to see who's joined before I start, so that I know the room is ready (e.g. "73/100 expected have joined").

**How it works:**
1. Trigger: Any player join/leave event in the lobby.
2. Logic: Server broadcasts the updated player list/count to the host's socket only.
3. Result: Host's screen updates the visible nickname list and count without a refresh.

**Inputs:** Join/leave events from Feature 3.

**Outputs:** Real-time UI update on host dashboard.

**Edge cases & error handling:**
- Edge case: 100+ nicknames — show a scrolling list or count-only view past a threshold rather than rendering all names, to avoid UI lag.

**Dependencies:** Feature 3.

---

## 5. Question Broadcast
**Category:** Live Quiz Flow
**Phase:** Phase 2
**Priority:** Must-have

**What it does:**
When the host advances the quiz, the current question (text, options, time limit) is sent to every joined player at effectively the same moment.

**User story:**
As a host, I want everyone to see the question at the same time, so that the game feels fair and synchronized, like an in-person event.

**How it works:**
1. Trigger: Host clicks "Next Question" (or auto-advance is configured).
2. Logic: Server sets room state to "question active," starts a server-side countdown, and emits a `question:show` event to every socket in the room with the question payload (excluding the correct answer).
3. Result: All players' screens transition simultaneously from "waiting" to the question view with a visible countdown.

**Inputs:** Room PIN, current question index.

**Outputs:** `question:show` broadcast to the room.

**Edge cases & error handling:**
- Edge case: A player's socket is mid-reconnect when broadcast fires → they receive the current question state on reconnect via a state-sync request (see Feature 12).

**Dependencies:** Features 2, 3.

---

## 6. Answer Submission & Validation
**Category:** Live Quiz Flow
**Phase:** Phase 2
**Priority:** Must-have

**What it does:**
Lets a player tap an answer, sends it to the server, and ensures each player's answer for a given question is counted exactly once.

**User story:**
As a participant, I want to tap my answer and know it was received, so that I trust my score is being counted correctly.

**How it works:**
1. Trigger: Player taps an option on the question screen.
2. Logic: Client emits `answer:submit` with question ID, selected option, and client-side timestamp (used only for UX, not scoring). Server checks: is this player in the room, is the question still active, has this player already answered this question ID? If any check fails, the submission is rejected or ignored.
3. Result: Server acknowledges receipt to the player (button locks, shows "answer submitted"); if rejected, client shows why (e.g. "time's up").

**Inputs:** Question ID, selected option index, room PIN (via socket session).

**Outputs:** Stored answer record in the room's in-memory state; ack sent to client.

**Edge cases & error handling:**
- Edge case: Duplicate submission (e.g. retry after network blip) → server ignores if an answer for that question ID already exists for that player (idempotent).
- Edge case: Submission arrives after the timer expired server-side → rejected, scored as no-answer.

**Dependencies:** Feature 5, Feature 7.

---

## 7. Server-Side Timer
**Category:** Live Quiz Flow
**Phase:** Phase 2
**Priority:** Must-have

**What it does:**
Runs the countdown for each question on the server, not the client, so no player can manipulate their local clock to answer "late" for extra credit or bypass the deadline.

**User story:**
As a host, I want timing to be fair and tamper-proof, so that no participant can exploit the clock.

**How it works:**
1. Trigger: `question:show` broadcast fires.
2. Logic: Server starts a timer for the question's configured duration. On expiry, server transitions room state to "question closed," stops accepting answers, and triggers scoring finalization.
3. Result: All clients show a synchronized countdown (server periodically emits remaining time, or clients count down locally from the initial value and reconcile on `question:results`).

**Inputs:** Question's configured time limit.

**Outputs:** Room state transition + `question:results` trigger.

**Edge cases & error handling:**
- Edge case: Server process hiccup delays timer firing → acceptable small drift; client-side countdown reaching zero also visually locks the answer buttons as a UX safeguard, even though server is the actual authority.

**Dependencies:** Feature 5.

---

## 8. Speed-Based Scoring
**Category:** Live Quiz Flow
**Phase:** Phase 2
**Priority:** Must-have

**What it does:**
Awards points for correct answers, scaled by how quickly the player answered relative to the time limit.

**User story:**
As a participant, I want faster correct answers to earn more points, so that quick thinking is rewarded like in a real live quiz.

**How it works:**
1. Trigger: A valid answer submission arrives (Feature 6).
2. Logic: If the selected option is incorrect, award 0 points. If correct, compute `points = base_points * (1 - time_taken_ms / time_limit_ms * 0.5)` (i.e. floor at 50% of base points for a last-second correct answer), rounded to the nearest integer, using server-recorded receipt time, not client timestamp.
3. Result: Player's cumulative score is updated; individual result (correct/incorrect + points earned) is available for the post-question reveal.

**Inputs:** Answer correctness, server-measured response time.

**Outputs:** Updated per-player score in room state.

**Edge cases & error handling:**
- Edge case: No answer submitted before timeout → 0 points, marked as "no answer" (distinct from "wrong answer" in results).

**Dependencies:** Features 6, 7.

---

## 9. Live Answer-Count Indicator
**Category:** Live Quiz Flow
**Phase:** Phase 2
**Priority:** Should-have

**What it does:**
Shows the host a running count of how many players have answered the current question while the timer is still active.

**User story:**
As a host, I want to see "84/100 answered" in real time, so that I know when it's safe to move on even before the timer runs out.

**How it works:**
1. Trigger: Each accepted answer submission (Feature 6).
2. Logic: Server increments a counter and broadcasts the updated count to the host's socket only, throttled to at most ~4 updates/second to avoid flooding the host UI during answer storms.
3. Result: Host dashboard shows a live-updating fraction.

**Inputs:** Accepted answer events.

**Outputs:** Throttled count broadcast to host.

**Edge cases & error handling:**
- Edge case: Answer storm (most players answer in the last second) → throttling prevents UI jank; final count is always accurate at question close regardless of throttling.

**Dependencies:** Feature 6.

---

## 10. Ranked Leaderboard
**Category:** Results
**Phase:** Phase 3
**Priority:** Must-have

**What it does:**
After each question closes, shows players ranked by cumulative score, with position changes visible.

**User story:**
As a participant, I want to see how I'm ranking against everyone else, so that the competitive element of the quiz comes through.

**How it works:**
1. Trigger: Question timer expires and scoring finalizes (Feature 8).
2. Logic: Server sorts all players by cumulative score descending, computes rank, and diffs against the previous ranking to flag movement (up/down/same).
3. Result: `question:results` broadcast includes the correct answer reveal, each player's own result, and the top-N leaderboard; host screen shows the full ranked list.

**Inputs:** Cumulative scores after Feature 8 finalizes.

**Outputs:** Ranked leaderboard broadcast.

**Edge cases & error handling:**
- Edge case: Score ties → stable secondary sort (e.g. by earliest correct answer) so ranking doesn't visibly flicker between updates.

**Dependencies:** Feature 8.

---

## 11. Host Controls (Pause/Skip/End)
**Category:** Host Tools
**Phase:** Phase 3
**Priority:** Must-have

**What it does:**
Gives the host manual control to pause the current question, skip to the next one early, or end the quiz before all questions are shown.

**User story:**
As a host, I want to control pacing live, so that I can adapt to the room (e.g. skip a question running long, or end early if time is short).

**How it works:**
1. Trigger: Host presses Pause, Skip, or End on the host dashboard.
2. Logic: Server updates room state accordingly — Pause freezes the countdown and blocks new answers; Skip force-closes the current question (scoring as normal) and advances; End transitions the room straight to a final results screen.
3. Result: All players' screens reflect the new state within one broadcast (e.g. "Host paused the game").

**Inputs:** Host control action.

**Outputs:** Room state change + broadcast to all players.

**Edge cases & error handling:**
- Edge case: Host presses Skip before any answers are in → question closes with all players scored as "no answer."

**Dependencies:** Features 5, 7, 8.

---

## 12. Reconnection Handling
**Category:** Reliability
**Phase:** Phase 3
**Priority:** Must-have

**What it does:**
Lets a player whose connection drops mid-quiz rejoin the same room under the same identity without losing their accumulated score.

**User story:**
As a participant on a flaky mobile connection, I want to be able to rejoin without losing my progress, so that one dropped connection doesn't ruin my session.

**How it works:**
1. Trigger: Player's socket disconnects and later reconnects (same nickname + PIN, or a stored session token).
2. Logic: Server matches the reconnecting client to their existing player record (by session token stored client-side), restores their score and rank, and sends a state-sync payload reflecting the room's current phase (lobby/question active/results).
3. Result: Player resumes exactly where the room currently is, with their prior score intact.

**Inputs:** Session token, room PIN.

**Outputs:** Restored player session + state-sync broadcast to that client only.

**Edge cases & error handling:**
- Edge case: Reconnect arrives after the question they missed has already closed → they simply see the current state, missed question counts as "no answer" (already scored at timeout).
- Edge case: Nickname reused by someone else while original player was disconnected → prevented by keying identity to session token, not nickname alone.

**Dependencies:** Features 3, 5.

---

## 13. Answer-Storm Throttling
**Category:** Reliability
**Phase:** Phase 3
**Priority:** Should-have

**What it does:**
Prevents a burst of near-simultaneous answers (common in the last seconds of a timer) from causing redundant, expensive leaderboard recalculation.

**User story:**
As a host, I want the dashboard to stay responsive even when 100 people answer in the same second, so that the live experience doesn't stutter.

**How it works:**
1. Trigger: A burst of `answer:submit` events arrives within a short window.
2. Logic: Individual answers are still validated and stored immediately (correctness isn't delayed), but the *leaderboard recomputation and count broadcast* are debounced to a fixed interval rather than firing per answer.
3. Result: Scoring stays accurate and instant per player; UI-facing aggregate updates (count, leaderboard) are smoothed.

**Inputs:** Answer submission rate.

**Outputs:** Debounced broadcast schedule.

**Edge cases & error handling:**
- Edge case: Final answer right at timer expiry → a final, non-debounced flush guarantees the closing count/leaderboard is always accurate.

**Dependencies:** Features 6, 9, 10.

---

## 14. Load Test Suite
**Category:** Validation
**Phase:** Phase 4
**Priority:** Must-have

**What it does:**
A script that simulates 100+ concurrent player clients joining a room and answering questions, to validate the system holds up before any live demo.

**User story:**
As the developer, I want to prove the system handles 100+ concurrent players before demoing it live, so that I'm not discovering scaling issues in front of an audience.

**How it works:**
1. Trigger: Run manually via `npm run loadtest` (or an Artillery config file).
2. Logic: Script opens N (100+) Socket.IO client connections to a locally-running server, has them join the same room PIN, then has them all submit an answer within a tight time window to simulate a real answer storm.
3. Result: Console/report output showing join success rate, answer acceptance rate, average broadcast latency, and any errors/timeouts.

**Inputs:** Target client count, server URL, room PIN.

**Outputs:** Load test report (console output or Artillery HTML report).

**Edge cases & error handling:**
- Edge case: Test reveals dropped connections past a certain count → treated as a bug to fix in the relevant Phase 2/3 feature, not accepted as a known limitation.

**Dependencies:** Features 3, 5, 6, 9, 10 (everything it's testing).

---

## 15. LAN Demo Mode
**Category:** Deployment (local)
**Phase:** Phase 4
**Priority:** Must-have

**What it does:**
Documents and verifies the path for running a live event with real devices on the same WiFi network as the host's machine, with no external hosting.

**User story:**
As a host, I want to run a real session with real phones without deploying anywhere, so that I can demo this at a college event using just my laptop.

**How it works:**
1. Trigger: Host starts the local server and finds their machine's LAN IP.
2. Logic: Server binds to `0.0.0.0` (not just `localhost`) so other devices on the same network can reach it; join page is accessed via `http://<host-IP>:<port>/join`.
3. Result: Any device on the same WiFi (phones, laptops) can join exactly like a hosted deployment, just scoped to the local network.

**Inputs:** Host machine's LAN IP and port.

**Outputs:** Reachable join URL for LAN devices.

**Edge cases & error handling:**
- Edge case: Host's firewall blocks inbound connections on the port → documented in README as a common gotcha with the fix (allow the port through OS firewall).

**Dependencies:** All prior features (this is the delivery mode for the whole app).

---

## Deferred / Future Features
- Cloud deployment — explicitly out of scope; app is designed to run entirely local/LAN
- Team mode (grouped scoring) — deferred to keep MVP scope tight
- Quiz import/export (JSON) — deferred, nice-to-have for sharing quizzes
- Media questions (images/video) — deferred, adds asset-handling complexity not needed for MVP
