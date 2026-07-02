# Shiftplanner Project Context

## Development

- Install dependencies: `bun install` (run this first if `node_modules` is missing)
- Build the client: `cd client && bunx vite build` (required before running dev server)
- Start the dev server: `bun run dev` (runs the Hono server with hot reload via `bun run --hot`)
- The server runs on `http://localhost:3000` and serves both the API and the built client
- If the server needs to be restarted, kill the running `bun run dev` process and start it again
- Rebuild the project with: `bun run build`
- Restart/rebuild workflow: kill the dev server, run `bun install` if deps changed, rebuild with `bun run build`, then restart `bun run dev`
- After making UI changes, run Playwright tests to verify functionality still works

## Testing

- UI tests use Playwright (via `@playwright/test`)
- Run Playwright tests: `cd client && npx playwright test`
- Before running Playwright tests, ensure the dev server is running (`bun run dev`) and the client is built (`cd client && bunx vite build`)
- Playwright config: `client/playwright.config.ts`
- Playwright tests are located in `client/tests/`
- After making UI changes, always run the Playwright tests to verify functionality still works
