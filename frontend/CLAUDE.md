# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Game Galaxy** — an Angular 22 web arcade with 8 games: Tetris, Snake (Snakeling), Tic-Tac-Toe, Memorama, Chess, Retro Runner, Nova Breaker and Ring Out. Uses standalone components (no NgModules), SSR via Express, and deploys to Netlify.

## Commands

```bash
ng serve              # Dev server (or npm start)
ng build              # Production build
ng test               # Run tests (Karma + Jasmine)
ng lint               # Lint
node dist/frontend/server/server.mjs  # Run SSR server (port 4000)
```

## Architecture

### Layered Structure

```
src/app/
├── presentation/          # UI layer
│   ├── pages/             # One per game + start, options, notfound
│   └── components/        # Reusable UI (modals, chess pieces, chronometer)
├── data/                  # Business logic
│   ├── services/          # Game controllers & utilities (one folder per game)
│   └── models/            # Data structures & enums
├── shared/                # Directives, shared styles
├── app.routing.ts         # Lazy-loaded routes with route-scoped providers
└── app.config.ts          # App-level DI config
```

Constants and static assets live under `src/assets/constants/` and `src/assets/images/`.

### TypeScript Path Aliases

```
@app/*              → src/app/*
@app-pages/*        → src/app/presentation/pages/*
@app-components/*   → src/app/presentation/components/*
@app-services/*     → src/app/data/services/*
@app-models/*       → src/app/data/models/*
@app-persistence    → src/app/data/persistence/index.ts
@app-input          → src/app/data/input/index.ts
```

### Input

Everything a player controls a game with (keys, the pointer, touch pads and swipes, buttons drawn on a canvas, vibration) goes through `data/input/` (`@app-input`). Games ask for actions (`left`, `jump`, `pause`…) and never read a key or a device themselves:

- Each game declares its actions and keys in `data/services/<game>/<game>-controls.ts` as `KeyBinding`s, matched by `keys` (`KeyboardEvent.key`), `codes` (the place on the keyboard) or `keyCodes` (the layout's letter, what Phaser's Keys use). Keep the one the game already used. Filters are per binding: `ignoreCase`, `ignoreRepeat`, `ignoreModifiers` (Ctrl, Cmd, Alt). `bindKeys` turns the table into a function; `otherwise` gives an action to keys with no binding (Tetris: any key settles a resting piece).
- The core is plain TypeScript: `key-bindings`, `action-source` (`ActionSource`, `anyDown`: an action is down if any source holds it — the place to add a stick on screen, a gamepad or the tilt of the phone), `zones` (`heldZones`, touch pads read from scratch every frame), `tap` (`TapTracker`, buttons that act on release), `swipe`, `drag` (`DragTracker`, a finger dragged over a board in steps of a cell, axis kept per stroke, plus taps), `turn` (`TurnTracker`, a pointer turning something round a center, the angle unwrapped, plus taps), `hold` (`HoldToConfirm`), `repeat` (`isFreshPress`), `device`, `pointer-lock` and `haptics` (`vibrate`, a no-op where the device cannot). It never imports a game, Angular or Phaser.
- Angular pages use `keyActions(bindings, { on, throttleMs?, otherwise? })` in an injection context: it listens on the document in the browser, nothing on the server, and stops with the component. `listenSwipes(element, onDirection)` and `listenDrags(element, { step, onStep, onTap })` are plain DOM, for code outside the zone. Tetris plays on a touch screen with `listenDrags` over its play area (`TETRIS_DRAGS`: drag sideways moves, drag down drops a row, tap rotates) and a mouse click on the board rotates; it has no buttons on screen.
- Phaser scenes import `@app-input/phaser-input`: `heldKeys(keyboard, bindings)` (Phaser Keys from `keyCodes`, read every frame; `onPress` hands each press its event) and `keyPresses(keyboard, bindings, onDown, onUp?)`. It only imports Phaser's types.
- Picking with the pointer (a card, a cell, a chess square) stays a `(click)` in the template, and Nova Breaker's analog paddle (`InputState`) and its HUD buttons (`hudPress` in `InputController`, tied to the paddle's pointer and the mouse lock) stay in the game: those are the game's own, not a device's.
- Tests: core specs feed `KeyLike` objects; `phaser-input.spec.ts` boots a real Phaser game. Run the suite with `ng test --browsers=ChromeHeadless`: the windowed Chrome stalls on the Phaser specs.

### Persistence

Everything kept between visits (records, settings, the install prompt's snooze) goes through `data/persistence/` (`@app-persistence`). Only `browser-store.ts` touches `localStorage`:

- Each game declares what it saves in `data/services/<game>/<game>-saves.ts` with `defineEntry`: key `gg:<game>:<name>`, a version, a fallback and a check per field (`count`, `number`, `flag`, `text`, `nullable`, `object`, `recordOf`). A missing, broken or other-version value reads as the fallback, field by field. What belongs to the site, not a game, uses `game: 'app'` (`pwa/pwa-saves.ts`).
- One owner per entry: Nova Breaker's settings live in `BreakerControllerService`, and `BreakerAudio` only hears the mute flag through `SET_MUTED`.
- Bump an entry's `version` when its shape or meaning changes (a new scoring): old values then read as the fallback.
- Angular services hold an entry with `persisted(entry)`: a signal that saves on `set`, backed by `GAME_STORE` (localStorage in the browser, memory on the server). Phaser code lives outside the injector and passes `browserStore()`.
- Record arithmetic shared by every game: `keepBest` and `bestPerKey`. What counts as a record (Breaker's practice runs do not) stays in the game.
- Tests use `memoryStore()`, through `{ provide: GAME_STORE, useValue: store }` or passed directly.

### Chess: modes and the machine

Chess opens on a menu (`welcome-chess-modal`, the same shape as Snakeling's): **Practice** (both sides moved on one screen) or **Machine** (a level and a side are picked first). `ChessController` owns the mode (`start`, `backToMenu`, `isBotTurn`, `machineSetup`); the level and side last picked are kept in `chess-saves.ts`.

- The machine is a chess engine of its own in `data/services/chess/engine/`, plain TypeScript like Nova Breaker's: `position` (board, legal moves, position keys), `piece-squares` and `evaluate` (how good a position looks), `search` (alpha-beta, one move deeper each round), `opening-book` and `chess-bot` (the levels). It never imports Angular or the game's services.
- `Position` keeps three things up to date move by move so nothing has to scan the board: the squares each side's pieces stand on (`pieceSquares`), and the sum of material and placement for a full board and for an endgame (`opening`, `endgame`, `phase`). `evaluate` starts from those sums and adds what depends on the rest of the board (mobility, pawn structure, passed pawns, king cover and attack). `exchange(move)` plays out the captures on a square without searching, and `checks(move)` tells a direct check before the move is made.
- The search has two ways of looking. By default it is selective: it gives up early on lines that look hopeless, tries only the first few quiet moves near the end of a line, and looks less deep at moves tried late. That takes it more than a dozen moves deep in under a second, but at a low depth it would miss replies as plain as moving an attacked piece away. `everyMove: true` looks at every move down to its depth: for the levels that see a set number of moves ahead. The two never share what they remember.
- Every level runs the same search. `CHESS_BOT_PROFILES` sets what tells them apart: how far ahead it looks and whether at every move (`depth`, `everyMove`), the longest it may think (`timeMs`), how often it settles for a move that is not the best it saw (`margin`, `slipChance`, `slipMargin`) and how many moves of a game it plays from the book (`bookPlies`). A new level is a new profile.
- `timeMs` is a ceiling, not what a move takes: the search answers when another round would not fit, sooner when its move has not changed for several rounds, and at once when one move stands far above the rest (a recapture). Book moves need no search at all. `CHESS_BOT_MIN_THINK_MS` is the least an answer takes on screen.
- It thinks in a web worker (`engine/chess-bot.worker.ts`, built through `webWorkerTsConfig` and `tsconfig.worker.json`) behind the `ChessBot` service, which the chess page provides itself so the worker stops with the page. Without workers it thinks on the page. The service is asked with the whole list of moves played, so the engine knows castling rights, en passant and repetitions without being told. `prepare()` loads the worker when a game against the machine starts, before the first question.
- The page asks from an effect whenever the machine owes a move. A worker cannot be interrupted, so a question that no longer applies (an undo, a pause, a new game, a newer question) is dropped with `cancel()`, which replaces the worker and answers null to whoever waited; the page also ignores any answer that is not to its last question. Undo against the machine takes back its answer together with the player's move.
- Measure before keeping a change to the engine: nominal depth says little (the selective search reaches depth 9 with a thirtieth of the positions the first version needed, and loses to it at equal depth), so compare versions by playing them against each other at equal time, a hundred games or more. Changes that looked right and measured nothing were left out.
- The engine's rules and the game's are two implementations: `chess-engine-agreement.spec.ts` plays random games through both and fails where they allow different moves. Run it after touching either.

### Ring Out: rings, clips and rods

A puzzle of levels: open rings held together by clips, and rods in metal clamps. A ring turns round its center; a clip lets go when the opening of the ring it is closed around slides past it; a ring left holding and held by nothing breaks; a rod slides out of its clamp unless something is in its way. Levels open one after the other and the best time of each is kept.

- The rules are plain TypeScript in `data/services/ringout/engine/` (`Board`), like Nova Breaker's: no Angular, no canvas. Pieces collide as discs sampled along them (`blobs`): a turning ring only checks what lies in its opening (`turnRange`), what lies beside its tube it slides past. A ring that holds a clip cannot turn. Nothing is ever put back, so a level that can be cleared stays clearable after any move: there are no dead ends.
- `levels.ts` holds the levels, each with a solution. `levels.spec.ts` plays every solution through the rules, checks the drawing with `levelProblems` (no overlaps, clips on tubes, every ring in a clip) and clears every level by following the hints (`solver.ts`, which the Hint button uses). A level that does not pass does not ship. `place` and `combine` build the later levels from earlier ones, turned, mirrored and moved.
- The page (`pages/ringout/`) draws on a canvas (`RingOutPainter`, glossy tubes with the site's hard shadow) and plays the moves in `RingOutTable`: tap a ring for a quarter turn, drag it to turn either way (`TurnTracker` in `@app-input`), tap a rod to slide it. A level wider than the screen is tall is drawn a quarter turn round on a phone.
- `RingOutController` owns the level, its clock (stopped while paused or the tab is hidden) and the progress saved in `ringout-saves.ts`. The page provides it, not the route, so the engine loads with the page.

### Key Patterns

- **Standalone components only** — every component uses `standalone: true` with explicit imports.
- **Route-scoped providers** — each game declares its own services in `app.routing.ts` to prevent cross-game state leakage.
- **Controller service per game** — each game has a central controller service (e.g., `TetrisControllerService`, `ChessController`) that owns game state and orchestrates logic.
- **Angular Signals** for reactive state, **RxJS Subjects** for event streams. No NgRx/Redux.
- **OnPush change detection** on all components.
- **Game loops run outside NgZone** (`ngZone.runOutsideAngular`) for performance.
- **SSR-safe code** — browser APIs (keyboard events, canvas, DOM) guarded with `isPlatformBrowser(PLATFORM_ID)`.

### Rendering Strategies

| Game | Rendering |
|------|-----------|
| Tetris | Canvas 2D |
| Retro Runner | Phaser 4 engine |
| Nova Breaker | Phaser 4 rendering a pure TS engine (`data/services/breaker/engine/`) |
| Chess | Angular templates + SVG piece components |
| Ring Out | Canvas 2D drawing a pure TS engine (`data/services/ringout/engine/`) |
| Snake, Memorama, Tic-Tac-Toe | DOM-based with CSS |

### Adding a New Game

Follow the existing pattern:
1. Create page component in `presentation/pages/`
2. Create controller service + supporting services in `data/services/`
3. Define models in `data/models/`
4. Add lazy-loaded route with route-scoped providers in `app.routing.ts`
5. Register game metadata in `src/assets/constants/games.ts`
