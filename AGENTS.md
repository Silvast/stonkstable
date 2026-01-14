# AGENTS.md

## Commands
- **Dev server**: `npm run dev`
- **Build**: `npm run build` (runs tests + tsc + vite build)
- **Typecheck**: `npm run typecheck`
- **Lint**: `npm run lint`
- **Test (watch mode)**: `npm test`
- **Test (single run)**: `npm run test:run`
- **Test (with UI)**: `npm run test:ui`
- **Test (with coverage)**: `npm run test:coverage`

## Architecture
- React 19 + TypeScript + Vite frontend for stock data visualization
- MUI (Material-UI v6) for components, styling via `sx` prop and emotion
- AWS Amplify backend in `amplify/` (auth + data resources)
- Stock data fetched from external API via `src/utils/stockTable.tsx`

## Structure
- `src/components/` - React components (e.g., Table/StockTable.tsx)
- `src/utils/` - Helper functions and API logic
- `src/assets/` - Static JSON data (stock lists: he.json, us.json, lse.json)
- `src/test/` - Test setup, mocks, and utilities
- `amplify/` - AWS Amplify backend configuration

## Code Style
- Strict TypeScript (`strict: true`, `noUnusedLocals`, `noUnusedParameters`)
- Functional components with hooks (useState, useEffect, useCallback, useMemo)
- Named exports for utilities, default exports for components
- MUI `sx` prop for responsive styling with breakpoint objects
- Interface definitions for data types (e.g., `StockEntry`, `StockData`)

## Testing
- **Framework**: Vitest + React Testing Library
- **Coverage**: Run `npm run test:coverage` for coverage reports
- **Test files**: `*.test.tsx` files co-located with source files
- **Mock API**: External stock API responses mocked in `src/test/mocks/`
- **Critical tests**: Autocomplete performance regression test (100 item limit)
