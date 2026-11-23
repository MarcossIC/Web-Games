# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Game Galaxy** — an Angular 22 web arcade with 7 games: Tetris, Snake (Snakeling), Tic-Tac-Toe, Memorama, Chess, Retro Runner, and Nova Breaker. Uses standalone components (no NgModules), SSR via Express, and deploys to Netlify.

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
- The core is plain TypeScript: `key-bindings`, `action-source` (`ActionSource`, `anyDown`: an action is down if any source holds it — the place to add a stick on screen, a gamepad or the tilt of the phone), `zones` (`heldZones`, touch pads read from scratch every frame), `tap` (`TapTracker`, buttons that act on release), `swipe`, `hold` (`HoldToConfirm`), `repeat` (`isFreshPress`), `device`, `pointer-lock` and `haptics` (`vibrate`, a no-op where the device cannot). It never imports a game, Angular or Phaser.
- Angular pages use `keyActions(bindings, { on, throttleMs?, otherwise? })` in an injection context: it listens on the document in the browser, nothing on the server, and stops with the component. `listenSwipes(element, onDirection)` is plain DOM, for code outside the zone.
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
| Snake, Memorama, Tic-Tac-Toe | DOM-based with CSS |

### Adding a New Game

Follow the existing pattern:
1. Create page component in `presentation/pages/`
2. Create controller service + supporting services in `data/services/`
3. Define models in `data/models/`
4. Add lazy-loaded route with route-scoped providers in `app.routing.ts`
5. Register game metadata in `src/assets/constants/games.ts`
