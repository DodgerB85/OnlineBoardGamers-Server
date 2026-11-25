# Welcome to the Online Board Gamers Git!

- Everyone is welcome to contribute to the project. 
- Download and setup the source code, make a change to something you’d like to improve, and submit a PR.
- Check out the goals/git issues for ideas on where specific help is needed.

    ✅ Graphic design/art
    ✅ Backend programmers
    ✅ Website design and layout
    ✅ Anything you’d like to improve

## Short term goals
- Improve design/readability of the site; try to replace some text with icons
- Improve test coverage
- Improve layout/design of the lobby / game lists / etc

## Long term goals
- More Games!
- Look at potentially moving the backend to JS to match the front end
- Look at moving hosts; carefully balance performance / costs

# Setup & Install

Pick one of the routes below; both quick routes run Django plus every game's Vite server on your machine, and Docker runs the same stack in containers.

Requirements:
- Git.
- Python 3.12+ (Django 6) and Node.js 22.12+ (Vite) on your PATH for the non-Docker routes.
- Docker Desktop (Windows/macOS) or Docker Engine + Compose (Linux) for the Docker route.

The quick routes use SQLite, so you don't need a MySQL server. The Docker route runs MySQL 9 in a container.

## Quick setup (Windows)

1. Clone the repo and open a terminal in its root:

   ```bat
   git clone https://github.com/DodgerB85/OnlineBoardGamers-Server
   cd OnlineBoardGamers-Server
   ```

2. Run `QuickSetup.bat` from the repo root (double-click it, or run it in cmd/PowerShell). It creates `.venv_local`, installs the Python and npm dependencies for every game, writes `.env` from `.env.docker` (switched to SQLite), runs the migrations, creates the `admin` superuser, and loads the development users.
3. Run `QuickRun.bat` from the repo root. It starts Django, the Django-Q worker, and all 14 game Vite servers in separate windows.
4. Open http://127.0.0.1:8000/ and log in as `admin` / `password` (or `user1` / `password`).

Python edits reload automatically; Vue edits hot-reload from `<GAME>/vue<GAME>/src`. If Windows Firewall prompts for the Vite processes, allow them on private networks. Re-run `QuickSetup.bat` after pulling changes that touch `requirements*.txt` or a `package.json`. If you already have a `.env`, it is left alone; copy any new keys across from `.env.docker`.

`initial_users.json` ships placeholder password hashes, so it is safe to load in production; the setup copies the admin hash onto those users in the local database.

LBR AI seats on Windows need WSL: set `LBR_AI_BIN` to `LBR/ai-service/bin/lbr-policy.cmd` in `.env` (see [LBR/ai/README.md](LBR/ai/README.md)). Everything else works without it.

## Quick setup (Linux / Ubuntu)

Install [process-compose](https://github.com/F1bonacc1/process-compose/releases) (single binary) and, on Ubuntu/Debian, the build headers `mysqlclient` needs:

```bash
sudo apt install python3-venv python3-dev pkg-config default-libmysqlclient-dev
```

Then:

```bash
./setup_linux.sh    # one-time setup (mirrors QuickSetup.bat)
process-compose up  # starts Django, the worker, and every Vite server with a live TUI
```

Useful commands (or use the TUI directly):
- `process-compose process stop web` — stop a single process
- `process-compose process start web` — restart it
- `process-compose down` — stop everything

## Docker (development)

This stack is for local development: it runs all 14 Vite servers with hot reload. For a server, use the [Docker production stack](#docker-production-stack).

1. Install Docker Desktop (Windows/macOS) or Docker Engine + Compose (Linux).
2. Clone the repo and open a terminal in its root.
3. Copy `.env.docker` to `.env` (`copy .env.docker .env` in cmd, `cp .env.docker .env` elsewhere). If you already have a `.env`, copy the new keys across instead of overwriting it.
4. Start everything:

   ```bash
   docker compose up --build -d
   ```

   The first build installs the Python dependencies and all 14 games' npm dependencies, so give it a few minutes.
5. First run only, after the containers are up, run the DB setup inside the web container:

   ```bash
   docker compose exec obs sh ./setup_db_script.sh
   ```

   This runs the migrations, creates `admin`, and loads the development users.
6. Open http://localhost:8000/ and log in as `admin` / `password` (or `user1` / `password`).

Everyday use:
- `docker compose up -d` — start the stack
- `docker compose down` — stop it (the MySQL volume is kept)
- `docker compose down -v` — stop it and delete the MySQL volume

Everything runs in source-code mode: the game pages load their JS from the matching Vite container (ports 3000-3069), and `obs` serves Django on 8000. Vue edits hot-reload. After changing a game's `package.json` or `vite.config.js`, rebuild just that service, e.g. `docker compose up -d --build fcm`.

MySQL is published on 3307 if you want to connect a client.

## Tests
Backend tests use Django's unittest runner: `python manage.py test tests.test_<name>`. The Vue clients for FCM, IND, ROW, KFW and RNB have frontend tests: run `npm test` in the game's `vue<GAME>` folder. See [docs/UNIT_TESTS.md](docs/UNIT_TESTS.md) for details.

## Deployment
Production currently runs on PythonAnywhere; deployments there are done manually with a batch script (git pull / collectstatic / etc).

### Docker production stack

`docker-compose.prod.yml` runs the compiled site without any Vite servers on a single host. It needs Docker Engine + Compose and an HTTPS reverse proxy already running on the host; the stack publishes only `127.0.0.1:8001`.

1. Copy `.env.prod.example` to `.env` on the server and fill in every secret. Keep `DEBUG=False` and every `*_USE_SOURCE_CODE=False`.
2. Start it:

   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```

   The one-shot `init` service runs migrations, `collectstatic` and offline compression before `obs` and `worker` start.
3. Point the host reverse proxy at `http://127.0.0.1:8001`, preserve the `Host` header and send `X-Forwarded-Proto: https`.
4. On a fresh database, create an admin with `docker compose -f docker-compose.prod.yml exec obs python manage.py createsuperuser`.

To move an existing database, start only the database (`docker compose -f docker-compose.prod.yml up -d db`), import the dump, then start the full stack. Never run `setup_db_script.sh` in production; it creates the development users.

Updates are `git pull` followed by `docker compose -f docker-compose.prod.yml up -d --build`. Follow logs with `docker compose -f docker-compose.prod.yml logs -f obs worker web`.

The deploy image uses the committed `*vuedist` bundles. After changing a game's Vue source, run `npm run build` in its `vue<GAME>` folder, delete the stray `images/` output (RNB also leaves `help/`), and commit the regenerated dist.

## Production
PA runs the Django server; there's a qcluster for async tasks (not currently used due technical limitations on PA that I'm in the process of working around), and the scripts in ./siteUtils generally run once a day to perform upkeep / notification emails.

Production is PythonAnywhere behind Cloudflare. Security, secrets, HTTPS and accepted risks are documented in [docs/SECURITY.md](docs/SECURITY.md). The critical deployment points:

- Cloudflare SSL/TLS mode is **Full (Strict)**, with **Always Use HTTPS** on.
- PythonAnywhere uses a Cloudflare Origin Certificate and has **Force HTTPS off**.
- Django must **not** enforce `SECURE_SSL_REDIRECT` on PythonAnywhere + Cloudflare; Cloudflare is the single redirect layer. See the doc before deploying the current setting.
- Health checks and uptime monitors must use `https://`, not `http://`.
- The live `.env` needs `DEBUG=False`, `LOCAL_USER=False`, a long random `SECRET_KEY_PRODUCTION`, and (recommended) a registered `TELEGRAM_WEBHOOK_SECRET`.

## License
This project is licensed under a custom **Source Available** license. 
- ✅ **Private Use:** Permitted.
- ✅ **Contributions:** Welcome via Pull Requests.
- ❌ **Commercial Use:** Prohibited without permission.
- ❌ **Public Hosting:** Prohibited without permission.

See the [LICENSE](LICENSE.md) file for the full legal text.
