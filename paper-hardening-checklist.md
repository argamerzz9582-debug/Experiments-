# Paper / Spigot Server Hardening Checklist

A practical, audit-ready checklist for a public Java + Bedrock Minecraft server.
Written for the InSane-Network-shaped setup: **single Paper node, Geyser/Floodgate crossplay,
LuckPerms, EssentialsX, an economy, an auction house, a custom web storefront, and a Discord community.**

Every item is a **config change or a verification step you run on your own box**. Nothing here requires
touching anyone else's server.

> **Why this document, and not "a list of your server's mistakes"**
> A hardening baseline protects you against classes of attack, not against one audit snapshot. If you run
> the items below you close the same holes any external probing would have found — and you close them
> permanently, instead of until the next plugin update.

---

## Priority order (do these first)

If you only do five things, do these:

| # | Action | Why it's the highest-value five minutes you'll spend |
|---|---|---|
| 1 | **Turn off public RCON** (`rcon.bind=127.0.0.1` or disable entirely) | An exposed RCON port with a weak password is instant full server compromise — `/op`, `/stop`, and world deletion |
| 2 | **`online-mode=true`** | Off = no identity. Anyone becomes anyone. Every other protection assumes this is on |
| 3 | **Put the backend behind a proxy with a firewall** (or firewall the node to trusted IPs) | Hides the origin, stops direct-IP attacks, kills the "no DDoS shield" problem |
| 4 | **Install CoreProtect and keep offsite backups** | Not prevention — **recovery**. When something does get through, this is the difference between a bad hour and a dead server |
| 5 | **Audit every plugin jar's origin** | Leaked/"nulled" premium plugins are the single most common backdoor vector in this community |

---

## 1. Network exposure

### 1.1 RCON — close it
```properties
# server.properties
enable-rcon=false
```
If you genuinely need RCON, never bind it public:
```properties
enable-rcon=true
rcon.port=25575
rcon.bind=127.0.0.1          # NOT 0.0.0.0
rcon.password=<32+ random chars>
```
- Restrict port 25575 at the firewall to localhost + your admin IP only.
- Password-attempt rate limiting: most RCON implementations have **none**. A public port is a
  no-rate-limit password oracle.
- Tools exist that brute this by default (MCPTool's `rconbrute` is exactly that, ships with
  `3digits`–`6digits` wordlists). They are one command away, which is why this is #1.

**Verify:** from *outside* your network, `nc -vz your.ip 25575` should time out, not connect.

### 1.2 Query protocol — disable unless you need it
```properties
enable-query=false
```
UDP query answers with full player lists and amplifies traffic (small request → large response).
It's a DDoS reflection vector and a free intel feed. You don't need it if your list sites use the
normal ping.

### 1.3 Backend/proxy separation
If you run Velocity/Waterfall (or plan to):

**On the backend Paper node:**
```yaml
# config/paper-global.yml
proxies:
  velocity:
    enabled: true
    online-mode: true
    secret: '<64-char random string>'
    # Do NOT use legacy/BungeeCord forwarding — it lets anyone spoof any UUID
  bungeecord:
    enabled: false
```
```properties
# server.properties on the backend
online-mode=true      # keep TRUE on the backend; the proxy does the Mojang auth
```

**At the firewall:** only the proxy's IP(s) may reach the backend port. Your node should refuse
`25565` from the internet entirely — all public traffic arrives via the proxy.

If you're **not** using a proxy (single node, as now): you have no origin hiding at all. Java Edition
can't go behind Cloudflare's proxy. Options: TCPShield / NeoProtect / Cosmic / a VPS-layer DDoS
filter, or accept the exposure consciously and keep the rest of this list tight.

### 1.4 Bedrock / Geyser / Floodgate
- Geyser listens on **UDP 19132** — UDP is easier to spoof and harder to filter. Keep it current.
- If the Bedrock endpoint is currently down (as observed on this network), decide whether to
  remove it from your site rather than advertise a port that isn't firewalled or maintained.
- **Floodgate:** never set `auth-type: online` on a Floodgate-enabled server without understanding it —
  Bedrock players have no Mojang session, so misconfiguration here either locks them out or
  lets them bypass auth. Follow the version-specific docs; this changes between releases.
- Restrict which backend servers Geyser can send Bedrock players to — don't let them reach staff-only
  or creative worlds.

---

## 2. Authentication & accounts

### 2.1 online-mode
```properties
online-mode=true
```
If you're **cracked** (offline mode) because of your player base, understand the trade exactly:
you have zero identity assurance. Anyone can join as any name. In that model, an auth plugin
(AuthMe / LibreLogin / nLogin) becomes your *only* identity layer, and §2.2 is mandatory rather than
advisory.

### 2.2 `/login` brute force (cracked servers — non-negotiable)
AuthMe-style config, the settings that matter:
```yaml
# AuthMe config.yml (names vary by version)
max_login_attempts: 3
kick_timeout: 30
captcha:
  use_captcha: true
  min_login_attempts_to_require_captcha: 3
  min_reg_attempts_to_require_captcha: 3
max_reg_per_ip: 3
enable_email_verification: true       # if you can support it
```
Plus, at the plugin level:
- **Sessions** with an IP/geo check, short expiry.
- **Rate-limit per IP, not just per account** — a botnet cycles usernames from one IP.
- **Temp-ban the IP** after N failures, not the account.
- A **limbo/timeout kick** for connections that never authenticate (anti connection-flood).
- Watch for the "logged in from a different location" / session-invalidation trick used to kick
  everyone: don't trust client-supplied locale/version, and validate sessions server-side.

**Verify:** script 50 wrong-password attempts from one IP against your *own* test account. You should
see captcha escalate, then an IP temp-ban, and your auth log should show it all.

### 2.3 Staff accounts
- **No shared staff accounts.** Every op is a person with a name.
- Require **2FA** on the Discord (staff get `Moderate Members`/`Ban Members`, not `Administrator`).
- Staff never log in from a publicly-shown alt.
- **Periodic `deop` audit:** list ops weekly, diff against your roster, remove anything you don't recognise.

---

## 3. Permissions

- **LuckPerms only.** No `ops.json` sprawl.
- Grant **specific** nodes, never `*`. An accidental `*` is a permanent compromise waiting for a
  staff account to be phished.
- Auditing commands:
  ```
  /lp editor                      # web editor, shows everything held
  /lp user <name> info            # confirm every grant
  /lp verbose record              # capture who is using what
  ```
- **Everyone gets `bukkit.command.plugins` denied?** No — keep `/plugins` visible to staff only if
  you can, but don't rely on hiding. Security by obscurity on a server is not security.
- **Sensitive nodes to lock down explicitly:**
  `minecraft.command.op`, `minecraft.command.deop`, `minecraft.command.stop`,
  `minecraft.command.gamemode`, `minecraft.command.give`, `minecraft.command.fill`,
  `bukkit.command.reload`, `essentials.*`, `worldguard.admin`.
- **`/fill` restriction matters:** the classic grief payload is
  `/fill ~ ~ ~ ~50 ~20 ~29 minecraft:tnt` plus a redstone trigger. If any non-staff rank can reach
  `/fill`, or a `WorldEdit` mask, you're one stolen account from a crater.
  ```yaml
  # worldedit-config.yml
  limits:
    max-blocks-changed:
      default: 100000        # low for non-staff
  ```
  and gate `//fast`, `//regen`, `//schem` behind staff-only groups.

---

## 4. Plugins — the real crime scene

**This is where almost every "nuked" incident actually starts.**

### 4.1 Never install a jar you can't trace
| Rule | Detail |
|---|---|
| Source | Only SpigotMC / Hangar (PaperMC) / Modrinth / the author's own GitHub release |
| Never | Discord DMs, "free rank plugin" links, Telegram channels, nulled/cracked premium jars |
| Hash | Record SHA-256 of every jar; re-verify after updates |
| Signing | Prefer plugins that publish a signed release or checksum |
| Two-person rule | A second person approves any new jar touching permissions or economy |

A "nulled" premium jar typically adds: a webhook ping on startup, an `/op` persistence hook, a
delayed command runner that fires after N hours, or a hidden listener that re-adds the attacker's
UUID to `ops.json` on join. **Static review misses these** because they're usually obfuscated.

### 4.2 Keep a short list
Every installed plugin is:
- a CVE surface you must patch,
- a permission tree that can be over-granted,
- and a supply-chain dependency you must trust.

Delete anything you don't actively use. A 40-plugin server has 40 maintainers who can be compromised.

### 4.3 Known high-risk categories to keep current
| Plugin class | Risk |
|---|---|
| **Votifier / NuVotifier** | Historically RCE-capable; default port 8192 exposed + weak/leaked token. Bind to localhost, use a long token, whitelist the vote sites' IPs |
| **EssentialsX** | Broad permissions; `/pay` and `/eco` integer-overflow and negative-amount abuse; `essentials.pay.others` misuse |
| **Economy / auction plugins** | Dupes via race conditions on `/ah` and `/sell`; negative-quantity inputs; item-stack overflow. Test with a **negative** amount and a **max-int** amount |
| **Shop / sign-shop** | Price tampering, item-swap exploits, permissionless creation |
| **Chat / placeholder plugins** | Placeholder injection (chat, tab, scoreboard) → mini-message injection, click events parsed from user input |
| **Geyser/Floodgate** | Version-coupled; config defaults have shifted; read the changelog before every bump |
| **Anti-cheat** | Not security — but an outdated one gives false confidence |

**Dupes and economy exploits crash servers more often than any "hack".** The usual end state is a
runaway entity/crafting loop that TPS-deaths the node. Test every economic pathway with:
negative quantity, zero quantity, max-int quantity, rapid double-submit, and disconnect-mid-transaction.

### 4.4 Command blocks and datapacks
```properties
enable-command-block=false      # unless you actually use them
max-command-feedback=0
```
Datapacks can run commands with `@a` and full server permissions. Treat a downloaded datapack exactly
like a jar: source it, read every `.mcfunction`, hash it.

---

## 5. The web storefront — your biggest unaudited surface

`www.insanesmp.net` is a **custom Next.js app** with its own store, `/tiers`, `/patrons`, and
`/punishments`. Custom code is where SQL injection, IDOR, and broken auth live — far more likely than
in any Paper plugin. And a store compromise means **player data and payment-adjacent data**.

Checklist for the site:

- [ ] **Never trust the client for purchases.** The server must verify payment with the payment
      provider (Stripe/Razorpay/PayPal webhook signature) and only then grant the rank. A "success"
      URL is not proof of payment.
- [ ] **Webhook signature verification** on every payment callback; reject unsigned.
- [ ] **Idempotency** — replaying a webhook must not grant the rank twice.
- [ ] **Parameterised queries everywhere.** Grep the codebase for string-concatenated SQL.
- [ ] **Object-level authz (IDOR).** `/api/user?id=` style routes: confirm the session user owns the id,
      every time, server-side.
- [ ] **Rate-limit** login, store checkout, `/punishments` search, and any public API.
- [ ] **Secrets in env vars, not in the repo.** Check the git history, not just the working tree —
      `git log -p | grep -i 'secret\|api_key\|password'`.
- [ ] **Minecraft↔web link must be proven.** When the store grants a rank, the player-name→UUID bind
      must come from a verified Mojang lookup, not a user-supplied string.
- [ ] **Admin routes** on a separate path with real auth (not a hidden URL).
- [ ] `.well-known/security.txt` with an honest contact — you have Discord tickets; add this too.
- [ ] Note: `/robots.txt` and `/sitemap.xml` 404. Cosmetic, but it means nobody has looked at this
      layer deliberately. That's usually a sign nobody has threat-modelled it either.

**Store policy risk (non-technical):** "all sales final, no refunds" on an unpublished business entity
is a consumer-protection exposure in India under the Consumer Protection (E-Commerce) Rules 2020 —
you're required to publish a legal entity name, address, and grievance officer. Worth fixing for the
same reason you lock the door: it's part of not getting burned.

---

## 6. Backups & recovery — the only thing that saves you

Prevention fails eventually. Recovery is deterministic.

- [ ] **CoreProtect** (or Prism) installed, logging block + container + entity + chat changes.
      This is rollback for griefing. It is the single highest-value plugin in this document.
      ```
      /co rollback u:<player> t:<time> r:<radius>
      ```
- [ ] **Automated world backups**, offsite (object storage, not the same disk, not the same provider).
      Frequency: if you'd be sad losing an hour, back up hourly.
- [ ] **Test the restore.** A backup you've never restored is a hope, not a backup. Restore to a
      scratch server once a month.
- [ ] **Snapshot before any risky change** — plugin update, config edit, world border change.
- [ ] **Offsite copies of `plugins/` configs** — not just the world. Rebuilding the world is easy;
      rebuilding 40 plugins' configs from memory is not.
- [ ] **Incident log.** Timestamp, what happened, what you changed. You will need this to tell players
      the truth after an outage, and to spot repeat attackers.

---

## 7. Monitoring & detection

You can't defend what you don't see.

| Signal | Where | What "bad" looks like |
|---|---|---|
| TPS / MSPT | `/tps`, `/spark health` | Sustained <19 TPS with no player-count reason = entity/dupe farm or attack |
| Join rate | proxy/`latest.log` | 100 joins/sec from one /24 = bot flood |
| Failed `/login` | auth plugin log | Bursts across many usernames |
| RCON connections | firewall log | Any connection from a non-admin IP |
| New ops | `ops.json` | Any diff you didn't make |
| Plugin list | `/plugins` on join | A name you don't recognise |
| Outbound connections | host `ss -tp` / netstat | Your server phoning somewhere on startup (nulled jar signature) |
| Entity count | `/spark`, `/entitycount` | A single chunk with 10k entities |
| File changes | `plugins/**` mtimes | Jars changing without you updating them |

**Free, high-value tools:** `/spark` (profiler — diagnose TPS crashes and dupe farms),
CoreProtect (rollback), Plan/PlayerAnalytics (join telemetry), a simple cron'd
`sha256sum plugins/*.jar > plugins.sha256` diffed daily (catches swapped jars).

---

## 8. If you are actually being attacked right now

1. **Don't restart blindly.** You lose the evidence and the process state. Capture first:
   `latest.log`, `ops.json`, `plugins/` hashes, `ss -tp`, `ps aux --sort=-%cpu`.
2. **Lock the doors:** set `whitelist on`, or firewall 25565 to your own IP, until you understand it.
3. **Rotate everything:** RCON password, proxy `secret`, auth DB password, web store secrets,
   Discord bot token, hosting panel password, SSH keys.
4. **Revoke Discord perms** for any non-staff role with administrative power.
5. **`deop` everyone**, then re-grant deliberately.
6. **Restore from the last clean backup** if files changed.
7. **Find the entry point before re-opening** — a cleaned box with an unpatched plugin is a countdown.
8. Tell your players what happened, plainly and early. Communities forgive downtime; they don't
   forgive being lied to.

---

## 9. Baseline reference set

### `server.properties` — the security-relevant lines
```properties
online-mode=true
enable-rcon=false
enable-query=false
enable-command-block=false
max-players=500                  # real capacity, not a wish
network-compression-threshold=256
rate-limit=0                     # raise if you see join floods; test first
enforce-secure-profile=true      # Java 1.19+: requires Mojang-signed chat
```
Plus, on Paper:
```yaml
# config/paper-global.yml
proxies:
  velocity:
    enabled: true
    online-mode: true
    secret: '<random 64>'
misc:
  max-joins-per-tick: 5          # anti join-flood
  authentication:
    server: true
```

### Firewall intent (the shape, not the syntax)
```
IN  25565/tcp   ← proxy IPs only (or internet, if single-node and you accept it)
IN  19132/udp   ← internet (Geyser), rate-limited if your filter allows
IN  25575/tcp   ← localhost + admin IP only      [ideally: nothing]
IN  22/tcp      ← admin IP only
IN  80/443/tcp  ← via Cloudflare / your CDN only
OUT all         ← monitor for unexpected egress
```

---

## 10. Scheduled hygiene

| Frequency | Task |
|---|---|
| **Daily** | Review ops list; hash plugin jars; confirm last backup exists |
| **Weekly** | Patch Paper + plugins; review new staff grants; read auth logs |
| **Monthly** | **Restore a backup to a scratch server**; review LuckPerms grants; audit store transactions for anomalies |
| **Quarterly** | Full config diff against this checklist; rotate secrets; remove unused plugins |

---

## Appendix — if you want to *test* rather than read

The legal way to learn what these attacks look like is to break your own box.

1. Run a Paper server locally (or a cheap throwaway VPS you own).
2. Point the tools at **`127.0.0.1`** — mineflayer bots, RCON clients, `/fill` payloads, `/login` fuzzing.
3. Watch the server-side signature of each in your logs.
4. Then go apply the matching §-item above and confirm the signature disappears.

That loop teaches more than any external scan, and it produces a hardened config instead of a
target list.
