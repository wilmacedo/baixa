# Baixa

A personal tracker for monthly bills and one-off expenses. Open a month, see what is still unpaid, and log an expense in a few seconds.

Single user, self-hosted, no telemetry, no external requests. The interface is in Brazilian Portuguese.

## How it works

- **Recurring bills** are defined once. Every month is generated from them as pending, until you change something in that month.
- **Marking a bill as paid**, or adjusting its amount for one month, only affects that month.
- **One-off expenses** are logged with an amount, a description, a category and a date. The category is suggested from the description.
- The big number is what is left to pay. The more you pay, the lighter it gets.

Everything is reachable from the keyboard. Press `?` in the app to see the shortcuts.

## Stack

TypeScript everywhere. React and Vite on the front end, Hono and SQLite (`better-sqlite3`) on the back end, Vitest for tests.

```
src/shared   domain rules shared by both sides (money, months, status, categories)
src/server   SQLite schema, repositories and the HTTP API
src/web      the interface
scripts      demo data and backup
```

## Development

Requires Node 20 and pnpm.

```sh
pnpm install
pnpm seed          # optional: fills a local database with made-up demo data
pnpm dev:server    # API on http://localhost:3000
pnpm dev:web       # interface on http://localhost:5173, proxying /api to the server
```

Before committing:

```sh
pnpm lint && pnpm typecheck && pnpm test
```

`pnpm seed` refuses to run on a database that already has data.

## Deployment

The app ships as a single container. There is no login, so keep it reachable only from a network you trust. On a Tailscale tailnet:

```sh
docker compose up -d --build
tailscale serve --bg 3000
```

The container listens on `127.0.0.1:3000`, and `tailscale serve` publishes it over HTTPS to your tailnet only. Do not use `tailscale funnel`, which would expose it to the internet.

The data lives in the `baixa-data` Docker volume, in a SQLite file at `/data/baixa.db`.

## Backup and restore

Do not copy `baixa.db` by hand while the app is running: SQLite keeps recent writes in a separate `-wal` file, so the main file alone can be missing data. Use the backup script, which takes a consistent snapshot:

```sh
docker compose exec baixa node_modules/.bin/tsx scripts/backup.ts /data/backup.db
docker compose cp baixa:/data/backup.db ./backup.db
```

To restore a snapshot, stop the app and replace the database in the volume:

```sh
docker compose down
docker run --rm -v baixa_baixa-data:/data -v "$PWD":/backup alpine \
  sh -c 'rm -f /data/baixa.db* && cp /backup/backup.db /data/baixa.db && chown 1000:1000 /data/baixa.db'
docker compose up -d
```

Backups, databases and spreadsheet exports are ignored by git. Never commit real financial data.
