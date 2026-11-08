#!/usr/bin/env python3
"""
mc_audit.py — security posture check for a Minecraft server YOU OWN.

Read-only. It performs exactly two things:
  1. A DNS/SRV lookup (public information, same as any player's client does).
  2. A standard Server List Ping (the same handshake the multiplayer menu uses).

It does NOT: brute force, exploit, flood, scan ports, or attempt authentication.
No payload is sent beyond a normal status ping.

Usage:
    python3 mc_audit.py insanesmp.net
    python3 mc_audit.py insanesmp.net --port 25565
    python3 mc_audit.py 127.0.0.1 --port 25565      # test your own box

Interpretation of results is in paper-hardening-checklist.md.
Only run this against infrastructure you own or operate.
"""

import argparse
import json
import socket
import struct
import sys


def varint(n: int) -> bytes:
    out = b""
    while True:
        b = n & 0x7F
        n >>= 7
        if n:
            out += bytes([b | 0x80])
        else:
            out += bytes([b])
            return out


def read_varint(sock) -> int:
    num = 0
    shift = 0
    while True:
        b = sock.recv(1)
        if not b:
            raise EOFError("connection closed")
        v = b[0]
        num |= (v & 0x7F) << shift
        if not v & 0x80:
            return num
        shift += 7


def pack_str(s: str) -> bytes:
    d = s.encode("utf-8")
    return varint(len(d)) + d


def status_ping(host: str, port: int, timeout: float = 8.0) -> dict:
    """Standard Server List Ping: handshake(state=1) + status request + status response."""
    with socket.create_connection((host, port), timeout=timeout) as s:
        s.settimeout(timeout)
        port_encode = port
        # packets are packed into a single varint-prefixed body; the data layer
        # is small enough that we can send them separately as the client does.
        handshake = (
            b"\x00"
            + varint(763)              # protocol version (arbitrary; status is version-agnostic)
            + pack_str(host)
            + struct.pack(">H", port_encode)
            + varint(1)                # next state = status
        )
        s.sendall(varint(len(handshake)) + handshake)
        s.sendall(varint(1) + b"\x00")  # status request

        read_varint(s)                  # packet length
        read_varint(s)                  # packet id (0x00)
        json_len = read_varint(s)
        buf = b""
        while len(buf) < json_len:
            chunk = s.recv(json_len - len(buf))
            if not chunk:
                break
            buf += chunk
        return json.loads(buf.decode("utf-8", "replace"))


def clean_motd(motd) -> str:
    if isinstance(motd, dict):
        c = motd.get("clean")
        if isinstance(c, list):
            return " | ".join(c)
        return c or ""
    return str(motd)


def main() -> int:
    ap = argparse.ArgumentParser(description="Read-only Minecraft server posture check.")
    ap.add_argument("host")
    ap.add_argument("--port", type=int, default=None)
    args = ap.parse_args()

    print(f"\n=== {args.host} ===\n")

    # ---- DNS / SRV --------------------------------------------------------
    print("[ DNS ]")
    if args.port:
        host, port = args.host, args.port
        print(f"  explicit target       {host}:{port}")
    else:
        try:
            answers = socket.getaddrinfo(args.host, None)
            ips = sorted({a[4][0] for a in answers})
            print(f"  A/AAAA                {', '.join(ips)}")
        except socket.gaierror as e:
            print(f"  A/AAAA                FAILED ({e})")
        try:
            answers = socket.getaddrinfo(args.host, 25565, type=socket.SOCK_STREAM)
            ips = sorted({a[4][0] for a in answers})
            print(f"  resolves :25565       {', '.join(ips)}")
        except socket.gaierror as e:
            print(f"  resolves :25565       FAILED ({e})")
        host, port = args.host, 25565

    # ---- ping -------------------------------------------------------------
    print("\n[ STATUS PING ]")
    try:
        data = status_ping(host, port)
    except Exception as e:
        print(f"  result                UNREACHABLE — {type(e).__name__}: {e}")
        print("\n  (An unreachable ping is not automatically a problem: the node may be")
        print("   firewalled to trusted IPs, which is the recommended posture.)")
        return 1

    players = data.get("players") or {}
    version = data.get("version") or {}
    print(f"  result                ONLINE")
    print(f"  version advertised    {version.get('name', '?')} (protocol {version.get('protocol', '?')})")
    print(f"  players               {players.get('online', '?')} / {players.get('max', '?')}")

    lst = players.get("list") or []
    if not lst:
        print("  player sample         not exposed            ✅ (good: less intel for scanners)")
    else:
        print(f"  player sample         {len(lst)} names exposed      ⚠️  (consider hiding)")

    print(f"  MOTD                  {clean_motd(data.get('motd'))!r}")
    print(f"  favicon               {'present' if data.get('icon') else 'none'}")

    # proxy hints
    ver = (version.get("name") or "").lower()
    if "velocity" in ver or "waterfall" in ver or "bungee" in ver:
        print(f"  proxy fingerprint     ⚠️  software name leaks the proxy type ({version.get('name')})")

    print("""
[ WHAT TO CHECK NEXT (manual — this script deliberately does not probe) ]
  RCON       from OUTSIDE your network: does 25575 time out?  Should be: yes.
  Query      is enable-query=false in server.properties?
  online     is online-mode=true?
  Direct IP  does the backend port still answer from the internet, bypassing your proxy?
  Backups    does yesterday's backup exist, and have you ever restored one?
""")
    return 0


if __name__ == "__main__":
    sys.exit(main())
