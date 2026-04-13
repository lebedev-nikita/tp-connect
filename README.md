# db-connect

`db-connect` is a small Node.js CLI that reads database URLs from `.env`, lets you pick one or more connections with checkboxes, and opens the selected ones in TablePlus.

## Requirements

- macOS
- TablePlus installed and available to `open -a TablePlus`
- Node.js 20+
- npm

## Install

```bash
npm install
```

## Usage

Add one or more database URLs to `.env`:

```dotenv
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app
ANALYTICS_URL=mysql://analytics:analytics@localhost:3306/warehouse
REPORTING_URL=mongodb://reporter:reporter@localhost:27017/reporting
```

Variable expansion is supported for `$VAR` and `${VAR}` references from the same `.env` file:

```dotenv
PG_USER=postgres
PG_PASSWORD=postgres
PG_HOST=localhost
PG_PORT=5432
PG_DB=app
DATABASE_URL=postgresql://${PG_USER}:${PG_PASSWORD}@${PG_HOST}:${PG_PORT}/${PG_DB}
```

Run the CLI from the same directory:

```bash
npm run build
node dist/cli.js
```

Run the test suite with Vitest:

```bash
npm test
```

After publishing globally, the command is:

```bash
db-connect
```

## Behavior

- Reads `.env` from the current working directory
- Expands `$VAR` and `${VAR}` references using variables from the same `.env` file
- Detects DSN-like values for supported database schemes
- Shows a checkbox prompt using the env var name plus a sanitized connection summary
- Opens only the selected URLs in TablePlus

Credentials are never shown in the prompt labels or success output.
Missing references expand to an empty string. Cyclic references fail with a clear error.
