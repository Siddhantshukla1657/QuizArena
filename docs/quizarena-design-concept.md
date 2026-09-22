# QuizArena: design concept

## 1. Introduction

QuizArena's entire design problem comes down to one thing: manufacturing a shared instant across a projected laptop and up to 100+ physically separate phones, then keeping that fiction intact when one of those phones loses WiFi for two seconds. Every screen in this concept earns its place by serving that one moment — a question appearing to everyone at once — or by protecting it when the network doesn't cooperate.

This is a **Purpose** decision as much as a visual one: because the project deliberately doesn't build accounts, cloud hosting, or a native app (per architecture.md), there's no login flow, settings page, or marketing surface competing for design attention. All of it can concentrate on the eight screens that actually exist — join, lobby, question, result, leaderboard, and their host-side counterparts. Nothing here is decoration; the shrinking countdown bar, the tap confirmation, the live answer count are all direct readouts of the server's actual state, which is what **Craft** means in this context — a timing value that isn't defensible against the real, authoritative server timer doesn't belong on screen.

## 2. Target audience

**The host** meets QuizArena on a laptop, standing in front of a room, usually with their screen projected. They built the quiz days in advance and are now managing a live event in real time — their need is control and reassurance: is the sync actually happening, how many of the 100 people in the room have answered, can I skip a question that's running long. Their design pulls toward density and precision: more information on screen, keyboard-and-mouse-appropriate targets, host-only chrome that must stay legible without being mistaken for something the projected audience should see.

**The player** meets QuizArena cold, mid-event, on whatever phone happens to be in their pocket — often on venue WiFi with a mediocre signal, often holding the phone one-handed. Their need is near-zero friction: a PIN and a nickname should get them playing in under ten seconds, and once a question is live, a visible countdown means every wasted second is a wasted point. Their design pulls the opposite direction from the host's: almost no chrome, four unmistakable tap targets, and enough resilience that a two-second WiFi drop doesn't cost them their standing (**Flexibility** — the same live event has to work for a laptop with a precise pointer and a phone that might momentarily lose signal).

These two audiences meet at exactly one moment — the question reveal — and that's the one point in the whole design where both screens must communicate the identical thing at the identical time, even though everything around that moment looks and behaves differently for each of them.

## 3. Design elements

### Color palette

The palette is built around one real fact: the host's screen is usually dimmed and projected into a room, while the player's screen is a phone held in ambient light — so the two primary surfaces are opposites, not variants of the same background at different tints.

| Role | Name | Hex | Notes |
|---|---|---|---|
| Host surface | Stage Charcoal | `#14121F` | Host dashboard background — holds contrast under projector glare and dims the room's ambient light rather than fighting it |
| Player surface | Device Porcelain | `#F5F4FA` | Player background — bright enough to stay legible in daylight/venue lighting, cool rather than warm so it doesn't compete with the answer colors sitting on top of it |
| Brand / primary action | Signal Violet | `#7C5CFC` | The one color used identically on both surfaces — "Start," "Join," "Next Question" — so the two audiences share one visual anchor for "this is the primary action" |
| Live status | Live Cyan | `#22D3D3` | Reserved exclusively for real-time signals: the live answer counter, the connection-health indicator. Never used decoratively, so its appearance always means "something is happening right now" |
| Answer A | Answer Coral | `#FF5A5F` | Triangle |
| Answer B | Answer Cobalt | `#2E5EFF` | Diamond |
| Answer C | Answer Amber | `#FFB800` | Circle |
| Answer D | Answer Emerald | `#00C48C` | Square — doubles as the "correct" feedback color, since it's already the highest-contrast positive hue in the set |

Answer Coral doubles as the "incorrect" feedback color for the same reason — reusing existing roles instead of introducing a ninth color for a state that only appears for two seconds per question.

### Typography

| Role | Typeface | Weight/tracking | Usage |
|---|---|---|---|
| Display | Space Grotesk | 700, tracking −0.02em, leading 1.0 at large sizes | Room PIN, question headline — geometric and confident enough to read from the back of a projected room |
| Body / UI | Sora | 400–600, tracking 0, leading 1.5 | Nicknames, form labels, host control labels, answer option text — distinct enough from Space Grotesk's geometry that the two never get mistaken for one weight of the same face |
| Data / mono | JetBrains Mono | 500, tabular figures | Live answer counts, scores, countdown seconds — tabular figures mean a count going from "9" to "10" doesn't shift the layout width, which matters because these numbers update multiple times a second during an answer storm |

Space Grotesk and Sora are deliberately not Inter or a generic system sans — the product's one loud visual moment (the PIN, projected large) needs a typeface with actual character, and the mono face for live numbers is a functional decision (layout stability under rapid updates), not a stylistic default.

### Iconography

One shared rule: solid fills, 2px optical stroke weight, built on a 24×24 grid, so an icon reads the same whether it's 16px in a form or blown up on a projector. Two families:
- **Answer shapes** — filled triangle, diamond, circle, and a square with a 3px corner radius (soft enough to feel like the same design language as the rest of the UI, not a sharp geometric outlier).
- **Host actions** — pause (two solid bars), skip (filled chevron-bar), end (filled stop-square in a circle), and a three-bar signal-strength glyph for connection health, which is the only icon that uses Live Cyan.

## 4. Layout and navigation

### Grid structure

**Host dashboard** — 12-column grid, designed for ≥1024px (a laptop screen, likely projected). The live question view uses the full 12 columns as the "stage" area — what the audience actually sees if the host's screen is projected as-is — with host-only controls pushed into a docked strip at the bottom, deliberately separated so a host who crops their projector view at the dock line never leaks pause/skip/end buttons to the room.

```
Row 1      [ 1 ......................................... 12 ]   Room PIN · countdown (stage)
Rows 2–7   [ 1 ......................................... 12 ]   Question text + 4 answer color blocks (stage)
Row 8      [ 1 ......................................... 12 ]   Live counter "84/100 answered" (stage)
─────────────────────────────────────────────────────────────  dock line — safe to crop for projector
Rows 9–10  [ 1—3 ]        [ 4—9 ]                [ 10—12 ]
             Pause     Connection health          Skip · End
```

**Player view** — single column, mobile-first, no meaningful grid beyond stacked full-width blocks. Primary screen (Question & Answer):

```
┌─────────────────────────────┐
│  ⏱ 00:07          Q3 of 8   │  status row — timer, progress
├─────────────────────────────┤
│                             │
│   What does a Socket.IO     │
│   "room" group together?    │  question — Space Grotesk, large
│                             │
├─────────────────────────────┤
│ ▲  A set of connected       │  Answer Coral
│    sockets                  │
├─────────────────────────────┤
│ ◆  A single database table  │  Answer Cobalt
├─────────────────────────────┤
│ ●  A REST endpoint          │  Answer Amber
├─────────────────────────────┤
│ ■  A CSS class               │  Answer Emerald
├─────────────────────────────┤
│ ▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░  │  shrinking countdown bar
└─────────────────────────────┘
```

### Interactive elements

- **Answer tile, with Click Spark (react-bits).** Each of the four tiles is a full-width, thumb-height (≥64px) color block with its shape icon and text. On tap, a small particle-spark burst confirms the tap registered before the tile visually locks — chosen from react-bits specifically because it has no Framer Motion dependency, matching the real constraint that player devices are arbitrary phones on venue WiFi, not the host's one dedicated laptop.
- **Live answer counter, with Number Ticker (Magic UI).** The host's "N/100 answered" counter digits roll rather than snap on each update. Unlike the player tiles, this runs on a single, capable host device, so the extra weight of Magic UI's animation isn't a real cost — it's chosen for the specific rolling-digit effect, not for consistency with the player-side library.
- **End Quiz confirmation, with Alert Dialog (shadcn/ui).** The only confirmation dialog anywhere in the product, reserved for the one genuinely irreversible host action (Agency: confirmation dialogs sparingly, only for real, unrecoverable actions like ending the session early).

## 5. Features

### Animations

- **Countdown bar** — hand-rolled, not a library component, because its width is driven directly by the server's live remaining-time value every tick, not a fixed keyframe. Critically damped (damping 1.0, response ~0.2s) so it reads as a steady, trustworthy signal rather than a decorative flourish.
- **Answer tile lock-in** — the Click Spark burst gets a slight bounce (damping ~0.8) specifically because it's triggered by the user's own tap-release; per the motion principles, overshoot earns its place on gestures that already carried momentum, and a finger lifting off a tile is exactly that.
- **Leaderboard reorder** — Magic UI's Animated List, critically damped (damping 1.0, response 0.4 — Apple's own shipped reposition value), because rank changes are an informational update the player should track calmly, not a moment that should call attention to itself with a bounce.
- **Lobby PIN reveal** — Aceternity's Sparkles behind the giant PIN display, the one theatrical moment in the whole product, used once, at the one point that's genuinely analogous to a marketing hero: the instant the room needs to notice a six-digit number before anything else can happen.
- **Reduced motion** — every spring above degrades to a plain opacity cross-fade; the Click Spark particle burst is replaced by a brief solid-color flash on the tile's border, and the Sparkles background is simply omitted rather than shown static, since a static particle field would still read as clutter without motion to justify it.

### Personalization

Grounded in control over real data the person already owns, not a cosmetic theme picker:
- **Host:** can reorder questions by drag right up until the session starts, and can save any quiz as a reusable template in their own local library — real control over content they authored, not a preference toggle.
- **Player:** can back out of the join screen and rejoin with a different nickname before the host starts the quiz, at no cost (Agency: forgiveness for a simple mistake like a typo'd nickname, rather than locking them into their first entry).

## 6. Testing and iteration

The known weakness is already named in this project's own phases.md and feature.md: answer storms and join storms at 100+ concurrent players, and mid-quiz reconnection on flaky mobile data. The test plan follows directly from that, rather than a generic usability pass:
- Load-test the exact scenario already scoped for Phase 4 (100+ simulated clients joining and answering in a burst) before ever testing the visual design with real people, since a beautiful screen that drops answers under load isn't actually testable yet.
- Run the real design with real phones on real venue WiFi — not a clean desk on office WiFi — specifically because the countdown bar and live counter are the two elements whose entire job is to stay trustworthy exactly when the network is under stress.
- Deliberately test one mid-quiz disconnect/reconnect per test session, since that's a real, named edge case for this product, not a hypothetical one.
- Embed the feedback mechanism in the product itself: a one-tap thumbs up/down on the host's final results screen ("How did that feel?"), asked immediately after the same live event just ended, while the experience is fresh rather than through a separate survey.

## 7. Launch strategy

This matches a solo build with no funding and no deployment target, so the strategy is a dry run, not a marketing campaign:
1. First real test at a small, low-stakes KJSCE session — a class or club meeting, not a large event — specifically to catch join-storm and WiFi issues at 15–30 people before ever trying 100+.
2. A full-scale run at an actual AR/VR council or department event once the small run is clean, treated as the real launch rather than a public release, since there's no hosting or install step for anyone outside that room.
3. No broader marketing motion — the entire "distribution" is a host opening their laptop and a room of phones hitting one LAN address, so growth isn't a design concern for this version.
