# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Game Galaxy** — an Angular 18 web arcade with 6 games: Tetris, Snake (Snakeling), Tic-Tac-Toe, Memorama, Chess, and Retro Runner. Uses standalone components (no NgModules), SSR via Express, and deploys to Netlify.

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
```

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
| Retro Runner | Phaser 3 engine |
| Chess | Angular templates + SVG piece components |
| Snake, Memorama, Tic-Tac-Toe | DOM-based with CSS |

### Adding a New Game

Follow the existing pattern:
1. Create page component in `presentation/pages/`
2. Create controller service + supporting services in `data/services/`
3. Define models in `data/models/`
4. Add lazy-loaded route with route-scoped providers in `app.routing.ts`
5. Register game metadata in `src/assets/constants/games.ts`
