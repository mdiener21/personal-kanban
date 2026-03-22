# Testing

## Standard Test Stack

- `Vitest` for unit tests in `tests/unit/`
- `Vitest` plus `@testing-library/dom` for DOM integration tests in `tests/dom/`
- `MSW` for mocked API behavior shared by Vitest suites in `tests/mocks/`
- `Playwright` for end-to-end, visual, and accessibility smoke tests in `tests/e2e/`

The canonical folder and naming conventions live in `docs/testing-strategy.md`.

## Test Scripts

- `npm test` - run unit, DOM, and E2E suites in sequence
- `npm run test:unit` - run unit tests only
- `npm run test:dom` - run DOM integration tests only
- `npm run test:e2e` - run Playwright only
- `npm run test:ui` - open Playwright UI mode
- `npm run test:debug` - run Playwright debug mode

## Current Coverage Focus

- Board management flows
- Task creation and validation
- Drag-and-drop performance into Done with large fixture boards
- Done-column virtualization behavior
- Swim lane rendering, settings persistence, and lane-aware moves

## Performance Coverage

- Dragging into Done with 300+ completed tasks targets sub-second drops
- Multiple consecutive drops target an average below 800ms
- Fixture data lives under `tests/fixtures/`
