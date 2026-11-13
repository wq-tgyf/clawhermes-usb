# Hermes Agent Adapter

This adapter runs Hermes Agent as the backend runtime for Hermes Web UI.

## Responsibilities

- Set `HERMES_HOME` to `data/hermes`.
- Start the Hermes API server via `hermes serve`.
- Keep sessions, memory, skills, and cron state portable.
- Provide a health check for dependent services.

## Expected Defaults

- API host: `127.0.0.1`
- API port: `8642`
- Data root: `data/hermes`

## 2026-04-30 Upstream Check

Hermes Agent public docs list Linux, macOS, and WSL2 as the supported installation path, with native Windows described as experimental. The gateway command suite includes `run`, `start`, `stop`, `restart`, `status`, `install`, `uninstall`, and `setup`.

For ClawHermes-USB, foreground `hermes serve --port 8642 --skip-build` is preferred because it is the command that actually binds the HTTP port and can be managed by our process manager. `hermes gateway run` starts the messaging gateway (Telegram/Discord) and does not listen on 8642.

## 2026-05-01 WSL2 Verification

- Verified in the project-managed `ClawHermes-Ubuntu` WSL2 distribution.
- Real upstream checkout: `apps/hermes-agent`, commit `ec1443b`.
- Setup command: create a temporary CRLF-normalized copy of `setup-hermes.sh`, then pipe `n` responses for optional prompts into that temporary script.
- Start command: `./venv/bin/hermes gateway run`.
- Health URL: `http://127.0.0.1:8642/health`.
- `verify-adapter hermes-agent --json` reported `productionReadyCandidate: true`.

## 2026-11-13 API Verification

- Installed from PyPI (`pip install --upgrade hermes-agent`) instead of the source checkout; the source install pulls an optional `kittentts` extra whose pinned `spacy` fails to build offline.
- Start command: `hermes serve --port 8642 --skip-build`.
- Health URL: `http://127.0.0.1:8642/api/status` (returns `200`). `/health` returns `404` in this upstream version.
- `hermes gateway run` does not bind port `8642`.
- Windows re-verification is still required.

Adapter status: `verified`
