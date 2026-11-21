# Security model and accepted risks

Reviewed: 2026-11-21.

This is the operational security reference for the Django site. It records what
the code enforces, what the deployment must enforce, and what is deliberately
accepted. It is not a claim that every game is cheat-proof.

## Scope and trust boundaries

- The server owns persistence, identity, permissions, turn coordination,
  kickouts, notifications and the page shell.
- Game rules, move generation, legality and replay are client-side by design
  (see `AGENTS.md`). The server enforces who may write, stale-version checks and
  payload limits; it does not try to prove that every move follows the rules.
- Production currently runs on PythonAnywhere behind Cloudflare. The Docker
  Compose stack, `QuickSetup.bat` and `setup_linux.sh` are development paths,
  not production.

## Production HTTPS (PythonAnywhere + Cloudflare)

Use one HTTPS redirect layer, and make it Cloudflare. PythonAnywhere's own
documentation warns that combining Cloudflare with PythonAnywhere's "Force
HTTPS" option or Django's `SECURE_SSL_REDIRECT` causes redirect loops.

### Cloudflare

1. SSL/TLS -> Overview -> Encryption mode: **Full (Strict)**.
   Use **Full** only if the origin certificate is self-signed or otherwise not
   trusted by Cloudflare. Do not use **Flexible**: it leaves the
   Cloudflare-to-origin connection unencrypted.
2. SSL/TLS -> Edge Certificates -> **Always Use HTTPS: on**. This is the layer
   that redirects visitors from `http://` to `https://`.
3. Optional: **Automatic HTTPS Rewrites: on**.

### PythonAnywhere

1. Web tab -> the web app -> Security -> HTTPS certificate: upload a
   **Cloudflare Origin Certificate** (Cloudflare: SSL/TLS -> Origin Server ->
   Create Certificate). PythonAnywhere's auto-renewed Let's Encrypt certificate
   is not the supported setup when Cloudflare is proxying the domain.
   The "Common Name mismatch" warning is expected with a Cloudflare Origin
   Certificate and can be ignored.
2. **Force HTTPS: off.** Cloudflare already redirects; two redirect layers
   fight each other.
3. Reload the web app.

### Django

`OnlineBoardGamers/settings.py` currently derives `SECURE_SSL_REDIRECT` from
`not TESTING`. For PythonAnywhere + Cloudflare this must resolve to **False**:
set it to `False` (or gate it behind an environment flag that defaults to
false) before deploying there. PythonAnywhere's proxy may present the request
to Django as HTTP even when Cloudflare connected over HTTPS, so Django would
redirect again and create a loop.

Keep `SECURE_PROXY_SSL_HEADER` as configured. Enable
`SECURE_SSL_REDIRECT` only on a host where Django itself terminates TLS, or
where a trusted reverse proxy forwards the original scheme and strips any
client-supplied `X-Forwarded-Proto` header.

### Verify

```sh
curl -I http://www.onlineboardgamers.com/        # one 301/308 to https
curl -I https://www.onlineboardgamers.com/       # 200, no Location
curl -IL https://www.onlineboardgamers.com/      # at most one redirect, then 200
```

If a browser has cached an old redirect, test in a private window and clear
site data. Purge the Cloudflare cache if a bad redirect was cached at the edge.

## Health checks

This repository has no production health check. `docker-compose.yml` is the
development stack and has no `healthcheck:`; PythonAnywhere does not use Docker
health checks.

Check whatever runs outside the repo:

- Cloudflare health checks or uptime monitoring.
- External uptime services (UptimeRobot, BetterStack, Pingdom, etc.).
- Load balancer or reverse-proxy checks.
- Deployment scripts or cron jobs that ping the site.
- Docker or Kubernetes health checks if used elsewhere.

Point every check at `https://`, and assert a `200` response rather than merely
"the request completed". For a self-signed origin certificate, install the
certificate in the checker's trust store rather than disabling verification
globally; `curl -k` is acceptable only for a loopback or private-network check.

If a check must use HTTP and cannot follow redirects, let the reverse proxy
answer a dedicated local endpoint (for example `/healthz` returning `200`)
instead of sending the check through Django. Do not add an unauthenticated
debug endpoint.

## Secrets and environment

The live `.env` is gitignored. Never commit secrets, webhook URLs or bot tokens.

| Variable | Purpose |
|---|---|
| `SECRET_KEY_PRODUCTION` | Django signing key when `DEBUG=False` and `LOCAL_USER=False`. |
| `SEECRET_KEY_HOME_SERVER` | Development signing key when `DEBUG=True` or `LOCAL_USER=True`. The typo is intentional and part of the existing configuration. |
| `TELEGRAM_OBG_BOT_TOKEN` | Telegram bot token. |
| `TELEGRAM_WEBHOOK_PATH` | URL path registered with Telegram. |
| `TELEGRAM_WEBHOOK_SECRET` | Optional Telegram webhook header secret. |
| `DEBUG` | Must be `False` in production. |
| `LOCAL_USER` | Must be `False` in production. |

### SECRET_KEY

Django uses the key for cryptographic signing: password-reset and activation
tokens, CSRF protection, session authentication hashes and signed messages. A
short or guessable key can let an attacker forge or tamper with that data.

`manage.py check --deploy` warns with `security.W009` when the key has fewer
than 50 characters, fewer than five unique characters, or starts with
`django-insecure-`. Generate a production key with:

```sh
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Rotating the key invalidates sessions, CSRF tokens and outstanding
password-reset/activation links; users may need to log in again. It does not
change passwords or game data. Django 4.1+ supports `SECRET_KEY_FALLBACKS` for
gradual rotation, but this project does not configure it.

### Telegram webhook secret

Telegram can register a webhook with a `secret_token`; it then sends
`X-Telegram-Bot-Api-Secret-Token` on every update. `Lobby/views.py` rejects
requests with `403` when the environment variable is set and the header does
not match.

- Empty `TELEGRAM_WEBHOOK_SECRET` skips the check (the old behaviour).
- Setting it makes the check active. You must then re-register the webhook
  with the same secret, or Telegram updates receive `403`.
- Allowed secret characters: 1-256 characters from `A-Z`, `a-z`, `0-9`, `_`
  and `-`.

```sh
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://www.onlineboardgamers.com/<TELEGRAM_WEBHOOK_PATH>" \
  -d "secret_token=<SECRET>"

curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

Update the `.env` and Telegram registration together, then restart the app so
the new environment value is loaded. If they differ, Telegram messages stop.

## Authentication and account policy

- Usernames use Django's `UnicodeUsernameValidator`: letters, digits and
  `@ . + - _` only. Registration and username changes reject HTML or script
  characters. Existing usernames are not renamed; rendering still escapes them.
- Password validators are all enabled with a minimum length of 8:
  user-attribute similarity, minimum length, common-password and numeric-only.
  Existing passwords remain valid until the password is next changed or reset.
- Failed logins are counted per IP+username and per username. Ten failures
  block that login for up to 15 minutes, even with the correct password.
  A successful login clears both counters. The Django admin login uses the
  same policy.
- The lockout counters use Django's cache. The project does not currently
  configure a shared cache, so with multiple web workers each worker has its
  own counter; configure Redis/Memcached before relying on a global limit.
- Auth pages send `Referrer-Policy: no-referrer` and `X-Robots-Tag: noindex,
  nofollow`. All responses get a small CSP for framing/object/base restrictions
  and a Permissions-Policy disabling camera, microphone and geolocation.

## Data and request safeguards

- JSON embedded in `<script>` blocks uses the `script_json` template filter,
  which escapes `<`, `>`, `&`, U+2028 and U+2029. Do not put user data in a
  script with `|safe`.
- Usernames and other user-visible strings are escaped in HTML, rewind panels,
  tournament winners, HLC history and TGZ PDF history.
- RNB maps are validated as JSON lists and capped at `MAX_RNB_MAP_BYTES`.
- Game and tournament chat accepts any authenticated user, but entries are
  validated and capped at 500 stored entries. Messages longer than 2000
  characters are rejected.
- `validated_actor_name` lets a player charge their own flexi-time, lets game
  admins act for a seat, and lets any player act for a missing or kicked seat.
  It does not let a player act for another active player.
- `latest_update_ok` permits the magic `9999999999999` value only on the first
  save of an empty game, or for a game admin.
- Rate limits cover registration, password reset, feedback, 404/admin alerts,
  tournament nudges, extra stats and the authenticated admin-message endpoint.

## Deliberate exceptions

These are owner decisions, not bugs. Do not change them without asking.

| Accepted risk | Why | What still applies |
|---|---|---|
| Chat is open to any authenticated user, including spectators and non-members of a tournament. | Social/spectator use; the owner wants anyone to be able to chat. | Entry shape and length validation, a 500-entry cap and normal authentication. |
| A private game can be joined by anyone with the link; "private" means unlisted, not invite-only. | The owner wants link sharing to work without an invite check. | Games in `ACTIVE` or `FINISHED` state reject joins; capacity and stale-write checks still apply. |
| Registration says when an email is already registered; login says when an account is inactive. | The owner wants clear account-status messages. | Registration is rate-limited per IP; login failures are rate-limited; password reset remains generic. |
| Existing short or weak passwords are not forcibly reset. | Avoid disrupting existing accounts. | New passwords must meet the current policy; users are upgraded when they next change or reset. |
| `TELEGRAM_WEBHOOK_SECRET` may be empty. | The secret is optional for deployments that have not registered one. | The path is unguessable and the check is recommended. If the variable is set, the header check is enforced. |
| Quick setup creates `admin` / `password`, development users, SQLite and local servers. | It is a local onboarding path, not production. | Never expose it publicly; production must use the live `.env` with `DEBUG=False` and `LOCAL_USER=False`. |
| Game rules and move legality are client-side. | The project is deliberately a "dumb server"; moving rules server-side is a separate project. | Server keeps identity, permission, mutex, stale-write and payload checks. Do not treat client state as trusted for authorisation. |

Webhook URLs are credentials. Admin messages and logs from the main
Discord/Slack/Telegram send paths now contain the webhook type and username
only, not the exception text that may contain the URL or token. Other
pre-existing notification logs may still include exception details; do not add
new ones.

## Production checklist

- Cloudflare: Full (Strict), Always Use HTTPS on.
- PythonAnywhere: Cloudflare Origin Certificate, Force HTTPS off.
- Django: `SECURE_SSL_REDIRECT` false on PythonAnywhere + Cloudflare.
- `.env`: `DEBUG=False`, `LOCAL_USER=False`, long random
  `SECRET_KEY_PRODUCTION`.
- `.env`: `TELEGRAM_WEBHOOK_SECRET` set and registered with Telegram, or
  deliberately left empty.
- Health checks and uptime monitors use `https://`.
- `manage.py check --deploy` has no `security.W009` warning.
- Confirm `https://www.onlineboardgamers.com/` returns `200` with no redirect
  loop, and a login POST works over HTTPS.

## References

- PythonAnywhere: <https://help.pythonanywhere.com/pages/Cloudflare/>
- PythonAnywhere HTTPS certificates:
  <https://help.pythonanywhere.com/pages/HTTPSSetup>
- PythonAnywhere forcing HTTPS:
  <https://help.pythonanywhere.com/pages/ForcingHTTPS>
- Django deployment checklist:
  <https://docs.djangoproject.com/en/stable/howto/deployment/checklist/>
- Cloudflare SSL modes:
  <https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/>
