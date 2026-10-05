# Contributing

## Language

Text shown to the user in the interface is Brazilian Portuguese. Everything else is English: code, identifiers, API, database, tests, docs and commit messages.

## Commits

- Follow [Conventional Commits](https://www.conventionalcommits.org): `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `build`, `ci`.
- One responsibility per commit, and keep commits atomic whenever possible.
- A change and the test that covers it belong in the same commit.
- Do not mix tooling, domain and interface changes in one commit.

## Code

- Comment only a non-obvious reason, never what the code already says.
- Keep it simple. No speculative abstractions, and add a dependency only when it clearly pays for itself.
- Run `pnpm lint`, `pnpm typecheck` and `pnpm test` before committing.

## Data

Never commit real financial data: databases, spreadsheet exports or reference material containing real amounts or names. Test fixtures use invented values.
