# QuizArena — Product Requirements Document

> **Status:** Draft | **Last updated:** 2026-09-22 | **Owner:** Siddhant Shukla

## 1. Overview
QuizArena is a live, host-run quiz application modeled on Kahoot: a host projects questions to a room, and 100+ participants answer simultaneously from their own devices in real time. Unlike Kahoot, QuizArena is designed to run entirely locally or over a LAN with no hosting/deployment required — built as a free, self-contained stack for events, classrooms, and demos where a live scoreboard experience is wanted without any cloud dependency or account signups.

## 2. Problem Statement
Running an interactive live quiz for a room of 100+ people currently means relying on a third-party platform (Kahoot, Quizizz) that requires internet access, an account, and often a paid tier for larger groups or advanced features. For a college event, hackathon, or classroom session on a local network (or with unreliable venue WiFi to the outside internet), there's no simple, free, self-hosted equivalent that the host fully controls and can run offline from their own machine.

## 3. Goals
- Let a host run a complete live quiz session for 100+ simultaneous participants with real-time synchronization
- Require zero cost, zero cloud accounts, and zero external dependencies to run
- Make joining as frictionless as Kahoot: a PIN and a nickname, no app install, no signup
- Prove the system holds up under realistic concurrent load before any live use

## 4. Non-Goals
- Cloud deployment or public hosting (explicitly local/LAN-only for this version)
- Native mobile apps (a mobile-responsive web page is sufficient)
- Multi-tenant support for many simultaneous independent events on one server instance
- Payment, monetization, or account systems of any kind

## 5. Target Users / Personas
| Persona | Description | Primary need |
|---|---|---|
| Event Host | Runs a college event, hackathon session, or classroom activity | Wants to run a polished live quiz without paying for or depending on a third-party platform |
| Participant | Attendee at the event, using their own phone | Wants to join instantly and compete on a live leaderboard with no setup |

## 6. User Stories
- As a host, I want to build a quiz ahead of time, so that I can run it live without last-minute setup.
- As a host, I want to start a session and get a shareable PIN, so that my audience can join in seconds.
- As a participant, I want to join with just a PIN and my name, so that I don't need to install anything or sign up.
- As a participant, I want to see the same question at the same time as everyone else, so the competition feels fair.
- As a participant, I want faster correct answers to score higher, so quick thinking is rewarded.
- As a host, I want a live leaderboard between questions, so the room stays engaged.
- As a host, I want to pause, skip, or end the quiz on demand, so I can adapt to the room in real time.
- As a participant on unreliable WiFi, I want to reconnect without losing my score, so a dropped connection doesn't end my game.

## 7. Requirements

### 7.1 Functional Requirements
1. The system must allow a host to create, edit, and delete quizzes made of multiple-choice questions.
2. The system must generate a unique room PIN when a host starts a quiz session.
3. The system must allow participants to join an active room using the PIN and a nickname, with no account required.
4. The system must broadcast each question to all joined participants at effectively the same time.
5. The system must accept exactly one scored answer per participant per question, rejecting duplicates.
6. The system must compute scores server-side based on correctness and response speed.
7. The system must display a ranked leaderboard to the host (and optionally participants) after each question.
8. The system must let the host pause, skip, or end the active quiz session.
9. The system must allow a disconnected participant to reconnect and resume with their existing score intact.
10. The system must run entirely on a local machine or local network, with no external hosting dependency.

### 7.2 Non-Functional Requirements
- **Scalability:** Must support at least 100 concurrent participant connections in a single room without dropped or duplicated answers.
- **Latency:** Question broadcast should reach all connected clients within ~500ms of the host triggering it.
- **Reliability:** A single dropped participant connection must not affect other participants or crash the host session.
- **Cost:** Every component of the stack must be free and open-source; no paid services or API keys required.
- **Portability:** The app must run from a single local machine using commonly available free tools (Node.js, a local database), with no cloud account setup.

## 8. Success Metrics
| Metric | Target | Timeframe |
|---|---|---|
| Concurrent participants supported | 100+ without dropped/duplicated answers | By end of Phase 4 |
| Question broadcast latency | <500ms to all clients | By end of Phase 4 |
| Successful LAN demo with real devices | End-to-end run with no manual intervention | By end of Phase 4 |
| Cost to run | $0 | Ongoing |

## 9. Constraints & Assumptions
- Constraint: No deployment — the app must be demoed locally or over LAN, not hosted publicly.
- Constraint: Free/open-source stack only, no paid tiers or metered APIs.
- Assumption: All participants join over the same local network as the host's machine (or the host's own localhost for smaller tests).
- Assumption: A single event runs one active room at a time; concurrent independent events on one server instance are not required.

## 10. Dependencies
- Node.js runtime (local install)
- Local database (SQLite, file-based, no server process required)
- Socket.IO and Artillery, both open-source npm packages

## 11. Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Answer/join storms at 100+ scale cause dropped events | Medium | High | Server-authoritative state, throttled broadcasts, dedicated load testing in Phase 4 |
| Venue WiFi can't handle 100+ devices on one LAN | Medium | Medium | Document bandwidth expectations; test on realistic WiFi before a real event, not just localhost |
| Host machine underpowered for 100+ live sockets | Low | Medium | Single Node process comfortably handles this scale; document minimum recommended specs |
| Firewall blocks LAN access to host's port | Medium | Low | Documented fix in README (allow inbound on the app port) |

## 12. Open Questions
- [ ] Should participants see the full leaderboard, or only the host (to avoid participants gaming visible rankings)?
- [ ] Is a persistent quiz library needed across sessions, or is a single-session quiz sufficient for now?
- [ ] What's the realistic upper bound on venue WiFi that needs to be tested (100 vs. 300 devices)?
