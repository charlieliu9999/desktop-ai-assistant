<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# Repository Guidelines

## Project Structure & Module Organization
- `src/main/`: Electron main process (entry `main.ts`, `window-manager.ts`).
- `src/renderer/`: React + TypeScript UI (pages, components, stores, styles).
- `src/services/`: Service layer. Prefer `src/services/adapters/*` (new code); avoid adding to `src/services/legacy/*`.
- `backend-service/app/`: FastAPI backend (APIs, services, models, schemas). Tests in `backend-service/tests/`.
- `assets/`, `docs/`, `tests/`: Static assets, documentation, and misc. tests/scripts.

## Build, Test, and Development Commands
- Frontend dev (Vite): `npm run dev:renderer`
- Electron app dev: `npm run dev` (renderer) + `npm run dev:main` (main), or use `./start-app.sh` / `./start-full-stack.sh`.
- Build app: `npm run build` (renderer + main), package: `npm run dist`, `npm run dist:mac|win|linux`.
- Lint/format/type-check: `npm run lint`, `npm run lint:fix`, `npm run type-check`.
- Frontend tests: `npm test`, coverage: `npm run test:coverage`.
- Backend dev: `cd backend-service && pip install -r requirements.txt && python -m app.main`.
- Backend tests: `cd backend-service && pytest` (coverage enforced; `htmlcov/` and `coverage.xml` generated).

## Coding Style & Naming Conventions
- Language: TypeScript (frontend), Python (backend).
- Formatting: Prettier (2 spaces, single quotes, semicolons, printWidth 100, trailing commas es5). Run `npm run lint:fix`.
- Linting: ESLint with `@typescript-eslint`, React rules, import sorting; `npm run lint` must pass.
- Naming: React components/types use PascalCase; files use `camelCase.ts(x)`; CSS uses `kebab-case.css`.
- Adapters-first: Implement integrations under `src/services/adapters/` with feature flags; do not extend `legacy` code.

## Testing Guidelines
- Frontend unit tests: Vitest. Name as `**/*.test.ts(x)` or `**/*.spec.ts(x)`. Co-locate near source when practical.
- E2E (optional): Playwright config at `playwright.config.ts`. Run with `npx playwright test` if e2e tests are present.
- Backend tests: Pytest in `backend-service/tests` with `python_files = test_*.py`. Coverage threshold `--cov-fail-under=80` (see `backend-service/pytest.ini`).

## Commit & Pull Request Guidelines
- Use Conventional Commits: `feat|fix|docs|refactor|test|chore(scope): message` (≤72 chars). Reference issues in the body (e.g., `Closes #123`).
- PRs must include: summary, linked issues, testing steps/commands, screenshots or logs for UI/behavior changes, and any config/env notes.
- Keep changes focused; update docs/tests alongside code. Ensure `lint`, `type-check`, and tests pass.

## Security & Configuration
- Never commit secrets. Copy and edit `backend-service/.env.example` to `backend-service/.env`.
- Useful envs: feature flags under `src/services/adapters/feature-flags.ts`, and `APP_ROUTING_MODE` used by startup scripts.
