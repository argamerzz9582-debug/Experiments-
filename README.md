# Experiments

Research notes and defensive tooling for Minecraft server infrastructure.

## Contents

| File | What it is |
|---|---|
| [`paper-hardening-checklist.md`](paper-hardening-checklist.md) | Full hardening checklist for a public Paper server — network exposure, auth, permissions, plugin supply chain, storefront, backups, monitoring, incident response |
| [`tools/audit_local.py`](tools/audit_local.py) | **Offline** audit you run *on* the server host. Read-only. Checks `server.properties`, Paper proxy config, ops drift, plugin jars (hashes + beacon hints), CoreProtect presence, backups |
| [`tools/mc_audit.py`](tools/mc_audit.py) | Read-only status-ping + DNS check for a server **you own** — the same handshake the multiplayer menu performs, nothing more |
| [`donutsmp-report.md`](donutsmp-report.md) | Public-info profile of `donutsmp.net` (live status, DNS, hosting, community, store) |
| [`insanesmp-report.md`](insanesmp-report.md) | Public-info profile of `insanesmp.net` (same treatment) |

## Using the tools

```bash
# On the server host, pointed at the server directory:
python3 tools/audit_local.py /path/to/minecraft-server

# Read-only reachability check (your own box only):
python3 tools/mc_audit.py 127.0.0.1 --port 25565
```

`audit_local.py` writes one file: `plugins/.jar-hashes.sha256`. Run it twice and the second run
tells you if any plugin jar changed — the most reliable signal that someone swapped a jar for a
backdoored one.

Neither script attacks anything. Neither script needs any dependency beyond Python 3.8+.

## Scope

The two server reports are compiled from public data only: the Mojang status-ping protocol,
public DNS, public invite APIs, and public websites. They contain no vulnerability findings and are
not an attack surface map.

The defensive material is generic on purpose. If you operate a server, run the checklist against
your own box — the highest-value items are RCON exposure, `online-mode`, origin-IP exposure, and
having a tested backup you can actually restore.
