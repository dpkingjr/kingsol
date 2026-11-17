# Kingsol Solitaire

A Next.js solitaire collection with four games:

| Route       | Game     | Options                         |
| ----------- | -------- | ------------------------------- |
| `/klondike` | Klondike | Draw 1 / Draw 3                 |
| `/freecell` | FreeCell | Auto-play to foundations on/off |
| `/spider`   | Spider   | 1, 2 or 4 suits                 |
| `/pyramid`  | Pyramid  | Pairs totalling 13, 3 passes    |

Every game has undo (also Ctrl/⌘+Z), restart, new game, a move counter, a timer and a win screen.
**Auto-save** (on by default, toggle in the toolbar) keeps each game's progress in the browser's localStorage, including undo history, timer and game options. Reopening a game picks up where you left off. Turning it off deletes all saved games.

To move cards, click a card and then where it should go, drag and drop it, or double-click to send it to the best spot.

## Running

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

## Layout

- `src/lib/cards.ts`: card model, seeded shuffle, shared stacking rules
- `src/lib/useGame.ts`: game state hook (undo history, moves, timer, win detection, auto-save)
- `src/lib/saveGame.ts`: localStorage save slots and the auto-save preference
- `src/games/*.ts`: rules for each game as pure functions (`deal`, `move`, `isWon`, …)
- `src/components/`: `CardView`, `Slot`, `Column` (nested so dragging a card drags the stack on it), `GameShell`
- `src/app/<game>/`: route page plus the client component for each game

Cards are drawn with CSS. There are no image assets, and card size scales with the viewport via `--cw`.
