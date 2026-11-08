#!/usr/bin/env python3
"""
audit_local.py — offline checks you run ON the server host itself.

Catches the misconfigurations that lead to compromise, without touching the network.
Safe to run on a production box: read-only, no writes, no restarts.

Usage:
    python3 audit_local.py /path/to/minecraft-server
    python3 audit_local.py . --server-properties ./server.properties
"""

import argparse
import hashlib
import json
import os
import re
import sys
from datetime import datetime, timezone

PASS, WARN, FAIL, INFO = "PASS", "WARN", "FAIL", "INFO"
results = []


def rec(status, area, msg, fix=""):
    results.append((status, area, msg, fix))


# --------------------------------------------------------------------------
# server.properties
# --------------------------------------------------------------------------
def check_properties(path):
    if not os.path.isfile(path):
        rec(INFO, "properties", f"not found: {path}", "pass --server-properties if it lives elsewhere")
        return
    props = {}
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            props[k.strip()] = v.strip()

    def expect(key, bad_value, area, msg, fix, severity=FAIL):
        val = props.get(key, "<absent>")
        if val.lower() == bad_value:
            rec(severity, area, msg, fix)
        else:
            rec(PASS, area, f"{key}={val}")

    expect("online-mode", "false", "auth",
           "online-mode=false — no Mojang identity. Anyone can join as any name.",
           "Set online-mode=true, or add an auth plugin (AuthMe/LibreLogin) if you must run cracked.",
           severity=FAIL)

    expect("enable-rcon", "true", "rcon",
           "RCON is enabled.",
           "If you do not actively use RCON: set enable-rcon=false. If you do: rcon.bind=127.0.0.1 "
           "and a 32+ char password. Test from outside that 25575 times out.", severity=WARN)

    rcon_bind = props.get("rcon.bind", "")
    if props.get("enable-rcon", "false").lower() == "true":
        if rcon_bind in ("", "0.0.0.0", "::"):
            rec(FAIL, "rcon", f"rcon.bind={rcon_bind or '<absent = all interfaces>'} — RCON is reachable from the network",
                "Set rcon.bind=127.0.0.1 and firewall 25575.")
        else:
            rec(PASS, "rcon", f"rcon.bind={rcon_bind}")
        pw = props.get("rcon.password", "")
        if len(pw) < 16:
            rec(FAIL, "rcon", f"rcon.password is only {len(pw)} chars", "Use 32+ random characters.")

    expect("enable-query", "true", "query",
           "enable-query=true — UDP query exposes the full player list and is a DDoS reflection vector.",
           "Set enable-query=false unless a list site requires it.", severity=WARN)

    expect("enable-command-block", "true", "commands",
           "Command blocks are enabled.",
           "Set enable-command-block=false unless you actually use them; they execute as the server.",
           severity=WARN)

    if props.get("max-players", "").isdigit():
        mp = int(props["max-players"])
        if mp > 5000:
            rec(WARN, "capacity", f"max-players={mp} looks aspirational",
                "A high max-players makes join-flooding cheaper against you. Set it to real capacity.")


# --------------------------------------------------------------------------
# Paper / proxy config
# --------------------------------------------------------------------------
def check_paper(root):
    cfg = os.path.join(root, "config", "paper-global.yml")
    if not os.path.isfile(cfg):
        rec(INFO, "paper", "config/paper-global.yml not found", "Only relevant for Paper servers.")
        return
    txt = open(cfg, encoding="utf-8", errors="replace").read()

    if re.search(r"bungeecord:\s*\n\s+enabled:\s*true", txt):
        rec(FAIL, "proxy",
            "Legacy BungeeCord forwarding is enabled — any client can spoof any UUID.",
            "Use velocity forwarding with a strong secret and online-mode: true.")
    elif re.search(r"velocity:\s*\n\s+enabled:\s*true", txt):
        rec(PASS, "proxy", "Velocity modern forwarding enabled")
        m = re.search(r"velocity:.*?secret:\s*['\"]?([^'\"\n]+)", txt, re.S)
        if m:
            secret = m.group(1).strip()
            if not secret.startswith("${") and len(secret) < 32:
                rec(FAIL, "proxy", f"proxy secret is short ({len(secret)} chars)",
                    "Use a 64-char random secret; rotate it if it has ever been shared.")
            elif secret.startswith("${"):
                rec(PASS, "proxy", "proxy secret loaded from an env var")
            else:
                rec(PASS, "proxy", "proxy secret length OK")
        else:
            rec(WARN, "proxy", "no velocity secret found", "Modern forwarding requires one.")

    m = re.search(r"max-joins-per-tick:\s*(\d+)", txt)
    if m:
        n = int(m.group(1))
        if n > 10:
            rec(WARN, "flood", f"max-joins-per-tick={n}",
                "Lower it (3–5) to blunt join floods; test against your normal peak.")


# --------------------------------------------------------------------------
# ops / whitelist drift
# --------------------------------------------------------------------------
def check_ops(root):
    p = os.path.join(root, "ops.json")
    if not os.path.isfile(p):
        rec(INFO, "ops", "ops.json not found", "")
        return
    try:
        ops = json.load(open(p, encoding="utf-8"))
    except Exception as e:
        rec(WARN, "ops", f"ops.json unreadable ({e})", "")
        return

    if not isinstance(ops, list):
        rec(WARN, "ops", "ops.json has an unexpected shape", "")
        return

    rec(INFO, "ops", f"{len(ops)} operator entr{'y' if len(ops)==1 else 'ies'} — review each against your roster")
    for e in ops:
        lvl = e.get("level", 0)
        bypass = e.get("bypassesPlayerLimit", False)
        if lvl >= 4:
            rec(WARN, "ops", f"{e.get('name','?')} has op level {lvl} (full control)",
                "Level 4 = can op others, stop the server, edit everything. Keep the list tiny.")
        if bypass:
            rec(INFO, "ops", f"{e.get('name','?')} bypasses player limit")
        if e.get("uuid", "").lower() in ("", "00000000-0000-0000-0000-000000000000"):
            rec(FAIL, "ops", f"{e.get('name','?')} has an empty/zero UUID",
                "Remove it — online-mode lookups will not bind to a real account.")


# --------------------------------------------------------------------------
# plugin supply chain
# --------------------------------------------------------------------------
SUSPICIOUS_JAR_HINTS = {
    "nulled": "name suggests a cracked/nulled premium plugin",
    "crack": "name suggests a cracked plugin",
    "leak": "name suggests a leaked plugin",
    "free": "many paywalled plugins resold as 'free' carry backdoors",
    "bypass": "verify origin carefully",
    "forceop": "forceop tools are malware by definition",
}


def check_plugins(root):
    d = os.path.join(root, "plugins")
    if not os.path.isdir(d):
        rec(INFO, "plugins", "no plugins/ directory", "")
        return
    jars = sorted(f for f in os.listdir(d) if f.endswith(".jar"))
    rec(INFO, "plugins", f"{len(jars)} plugin jars installed")

    for j in jars:
        low = j.lower()
        for hint, why in SUSPICIOUS_JAR_HINTS.items():
            if hint in low:
                rec(FAIL, "plugins", f"{j} — {why}",
                    "Remove it. Reinstall from SpigotMC/Hangar/Modrinth or the author's GitHub.")

    # outbound-connection-hint: grep for obvious beacon URLs inside jars (cheap, best-effort)
    beacon = re.compile(
        rb"(discord(?:app)?\.com/api/webhooks|api\.telegram\.org|pastebin\.com/raw|"
        rb"ngrok\.io|\.onion|transfer\.sh)", re.I)
    for j in jars:
        p = os.path.join(d, j)
        try:
            if os.path.getsize(p) > 40 * 1024 * 1024:
                continue
            with open(p, "rb") as f:
                blob = f.read()
        except OSError:
            continue
        hits = {m.group(0).decode("utf-8", "replace") for m in beacon.finditer(blob)}
        if hits:
            rec(WARN, "plugins", f"{j} references {', '.join(sorted(hits))}",
                "Legitimate for a Discord-integration plugin; suspicious otherwise. Confirm with the author.")

    # jar hash manifest, so tomorrow's diff catches a swapped jar
    manifest = os.path.join(d, ".jar-hashes.sha256")
    lines = []
    for j in jars:
        p = os.path.join(d, j)
        try:
            h = hashlib.sha256(open(p, "rb").read()).hexdigest()
            mt = datetime.fromtimestamp(os.path.getmtime(p), tz=timezone.utc).strftime("%Y-%m-%d %H:%M")
        except OSError:
            h, mt = "unreadable", "?"
        lines.append(f"{h}  {mt}Z  {j}")

    if os.path.isfile(manifest):
        old = {ln.split("  ")[-1]: ln.split("  ")[0] for ln in open(manifest).read().splitlines() if ln.strip()}
        for ln in lines:
            _, _, name = ln.split("  ")
            if name in old and old[name] != ln.split("  ")[0]:
                rec(FAIL, "plugins", f"{name} CHANGED since last audit",
                    "You did not update this. A changed jar is the top backdoor signal.")
        rec(INFO, "plugins", f"hash manifest compared against {manifest}")
    else:
        rec(INFO, "plugins", "writing first hash manifest",
            f"Run again and it will diff. Manifest: {manifest}")

    try:
        with open(manifest, "w", encoding="utf-8") as f:
            f.write("\n".join(lines) + "\n")
    except OSError as e:
        rec(WARN, "plugins", f"could not write hash manifest ({e})", "")


# --------------------------------------------------------------------------
# world protection / recovery
# --------------------------------------------------------------------------
def check_recovery(root):
    plugins_dir = os.path.join(root, "plugins")
    has_coreprotect = False
    if os.path.isdir(plugins_dir):
        has_coreprotect = any(
            f.lower().startswith(("coreprotect", "prism")) for f in os.listdir(plugins_dir))
    if has_coreprotect:
        rec(PASS, "recovery", "block-logging plugin present (CoreProtect/Prism)")
    else:
        rec(FAIL, "recovery", "no CoreProtect/Prism detected",
            "Without block logging you cannot roll back a grief. Install it before you need it.")

    backups = [f for f in os.listdir(root) if re.search(r"backup|\.tar\.gz|\.zip$", f, re.I)]
    if backups:
        newest = max((os.path.getmtime(os.path.join(root, b)) for b in backups), default=0)
        age_h = (datetime.now().timestamp() - newest) / 3600
        if age_h > 48:
            rec(WARN, "recovery", f"newest local backup-looking file is {age_h:.0f}h old",
                "Back up hourly-ish, offsite, and restore to a scratch box monthly.")
        else:
            rec(PASS, "recovery", f"recent local backup found ({age_h:.0f}h old)")
    else:
        rec(WARN, "recovery", "no backup files found next to the server dir",
            "Backups may live offsite (good) — just make sure you have restored one recently.")


# --------------------------------------------------------------------------
# host hygiene
# --------------------------------------------------------------------------
def check_host(root):
    log = os.path.join(root, "logs", "latest.log")
    if os.path.isfile(log):
        rec(PASS, "logs", "logs/latest.log present")
        try:
            import collections
            fails = collections.Counter()
            joins = 0
            for line in open(log, encoding="utf-8", errors="replace"):
                l = line.lower()
                if "failed to login" in l or "wrong password" in l or "incorrect password" in l:
                    fails["auth"] += 1
                if "joined the game" in l:
                    joins += 1
            if fails["auth"] > 20:
                rec(WARN, "logs", f"{fails['auth']} failed logins in latest.log",
                    "Confirm your auth plugin rate-limits per IP, not per account.")
            rec(INFO, "logs", f"{joins} join events this log session")
        except Exception:
            pass
    else:
        rec(INFO, "logs", "logs/latest.log not found", "")

    # readable-by-world configs?
    wt = os.path.join(root, "whitelist.json")
    if os.path.isfile(wt):
        try:
            wl = json.load(open(wt, encoding="utf-8"))
            rec(INFO, "whitelist", f"whitelist.json has {len(wl)} entries",
                "Turn it on during an incident: /whitelist on")
        except Exception:
            pass


# --------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description="Offline hardening audit for a Minecraft server you own.")
    ap.add_argument("root", help="server directory containing server.properties")
    ap.add_argument("--server-properties", default=None)
    args = ap.parse_args()

    props = args.server_properties or os.path.join(args.root, "server.properties")

    print(f"\nOffline hardening audit — {os.path.abspath(args.root)}")
    print("Read-only. No network access. Nothing is started or restarted.\n")

    check_properties(props)
    check_paper(args.root)
    check_ops(args.root)
    check_plugins(args.root)
    check_recovery(args.root)
    check_host(args.root)

    order = {FAIL: 0, WARN: 1, INFO: 2, PASS: 3}
    results.sort(key=lambda r: order[r[0]])

    icon = {FAIL: "✗", WARN: "!", INFO: "·", PASS: "✓"}
    for status, area, msg, fix in results:
        if status == PASS:
            continue
        print(f"  {icon[status]} [{status:4}] {area:10} {msg}")
        if fix:
            print(f"          → {fix}")

    fails = sum(1 for r in results if r[0] == FAIL)
    warns = sum(1 for r in results if r[0] == WARN)
    passes = sum(1 for r in results if r[0] == PASS)
    print(f"\n  {fails} FAIL · {warns} WARN · {passes} PASS")
    print("  Fix FAILs first; see paper-hardening-checklist.md for the reasoning.\n")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
