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

The app ships as a single container. There is no login, so keep it reachable only from a network you trust:

```sh
docker compose up -d --build
```

The container publishes port `3000` on all host interfaces, so it is reachable from the LAN and, on a machine running Tailscale, from the tailnet at `http://<host>:3000`. Do not forward the port on your router or use `tailscale funnel`, which would expose it to the internet.

The data lives in the `baixa-data` Docker volume, in a SQLite file at `/data/baixa.db`.

## Importing the old spreadsheet

The importer reads CSV exports of the spreadsheet, one per month tab. It is meant to be run by hand, once.

1. In Google Sheets, open each month tab and use **File > Download > Comma-separated values**. Put the files in one folder. The tab name must be in the file name (for example `Planilha - Set_2026.csv`), because that is how the month is found. Tabs that are not months, such as the template tab, are skipped.
2. Do a dry run. It writes nothing and prints the totals of each month (pending, paid, cards, one-offs) so you can compare them with the spreadsheet:

   ```sh
   pnpm import-sheet ./csv
   ```

3. When the totals match, import. It refuses to run on a database that already has data:

   ```sh
   pnpm import-sheet ./csv --apply
   ```

   With the container, copy the files in and run it there:

   ```sh
   docker compose cp ./csv baixa:/tmp/csv
   docker compose exec baixa node_modules/.bin/tsx scripts/import-sheet.ts /tmp/csv --apply
   ```

Recurring bills are inferred from the names in the tabs. The amount is the latest one found and the due day is the day of the latest payment, so review the due days in the recurring bills screen afterwards. Bills missing from the newest month are imported as inactive.

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
