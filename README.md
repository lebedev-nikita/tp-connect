# tp-connect

`tp-connect` opens database connection URLs from your `.env` file in TablePlus.

It is meant for people who already keep database credentials as connection strings and want a quick way to choose one or more connections from the terminal.

## Requirements

- macOS
- TablePlus installed
- Node.js 20+

## Install

Install it globally:

```bash
npm install -g tp-connect
```

Then run:

```bash
tp-connect
```

## How It Works

1. Put a `.env` file in the directory where you want to run `tp-connect`.
2. Add one or more database connection URLs to that file.
3. Run `tp-connect`.
4. Select the connections you want with the checkbox prompt.
5. Press `Enter` to open them in TablePlus.

Selected connections are opened in TablePlus tabbed mode.

## Example `.env`

You can use any variable names. `tp-connect` looks for values that are valid database URLs.

```dotenv
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app
ANALYTICS_URL=mysql://analytics:analytics@localhost:3306/warehouse
REPORTING_URL=mongodb://reporter:reporter@localhost:27017/reporting
```

## Variable Expansion

You can build one connection string from smaller variables in the same `.env` file:

```dotenv
PG_USER=postgres
PG_PASSWORD=postgres
PG_HOST=localhost
PG_PORT=5432
PG_DB=app
DATABASE_URL=postgresql://${PG_USER}:${PG_PASSWORD}@${PG_HOST}:${PG_PORT}/${PG_DB}
```

Supported expansion syntax:

- `$VAR`
- `${VAR}`

Rules:

- Expansion only uses variables from the same `.env` file.
- Missing variables expand to an empty string.
- Cyclic references fail with a clear error.

## What Gets Shown In The Prompt

The selection list shows:

- the environment variable name
- a sanitized summary of the target connection

Credentials are never shown in the prompt labels or normal success output.

## Notes

- Run `tp-connect` from the same directory as your `.env` file.
- If no valid database URLs are found, nothing will be shown to select.
- The current version supports macOS because it launches TablePlus with the macOS `open` command.
