# InSane SMP (`insanesmp.net`) — Full Information Report

**Compiled:** 2026-11-08 ~04:25–04:30 UTC
**Method:** same as the DonutSMP report — live Server List Ping data via the endpoints MCPTool's `server` command calls (`api.mcsrvstat.us/3`, `api.mcstatus.io/v2`), plus Cloudflare DNS-over-HTTPS resolution, IP intel, Discord's public invite API, and the official `www.insanesmp.net` site.

> ⚠️ **Read this first:** `insanesmp.net` is *not* the famous server. It's a small **Indian** Paper survival network (the "Insane Network") with **~220 players out of 500 slots**. Multiple third-party listing sites paste a completely different (US, exaroton-hosted, owner `valiantphalanx`) server description onto this IP — that data is recycled and wrong. Everything below is from the live system itself.

---

## 1. Live status (snapshot 04:25 UTC)

| Field | Value |
|---|---|
| Status | **ONLINE** |
| Java address | `insanesmp.net` → **25565** (SRV → `play.insanesmp.net:25565`) |
| Direct address | `play.insanesmp.net` also answers on 25565 |
| Resolved IP | **`155.103.48.224`** |
| Players | **213–226 / 500** across two samples ~2 min apart |
| Software | **Paper 26.3** (vanilla-ish Paper, *not* a proxy/Velocity setup) |
| Protocol | 777 (advertised version 26.3) |
| MOTD | `§bInsaneSMP.net` / `§fꜱᴜʀᴠɪᴠᴀʟ §8•§f ᴇᴄᴏɴᴏᴍʏ §8•§f ᴘʀᴀᴄᴛɪᴄᴇ` |
| MOTD (clean) | `InsaneSMP.net` — `ꜱᴜʀᴠɪᴠᴀʟ • ᴇᴄᴏɴᴏᴍʏ • ᴘʀᴀᴄᴛɪᴄᴇ` (small-caps Unicode, same anti-filter trick DonutSMP uses) |
| Player list in ping | **empty** — the server does not expose a sample |
| Query (UDP 25565) | **disabled** ("Failed to read from socket") |
| EULA block | false |

**Bedrock: advertised everywhere, but not currently answering.**

| Check | Result |
|---|---|
| `api.mcstatus.io/v2/status/bedrock/insanesmp.net` | `online: false`, port 19132, resolves to `155.103.48.224` |
| `api.mcsrvstat.us/bedrock/3/insanesmp.net` | `online: false` — "DNS lookup failed, no IP detected" |
| Website / listings | claim Bedrock on **port 19132** |

Only A records exist for `insanesmp.net` and `play.insanesmp.net`; there's no separate Bedrock SRV. So **the Bedrock endpoint is either off or firewalled right now** — the website's "Bedrock: 19132" is aspirational at this moment. Java works fine.

### Player activity (third-party hourly telemetry)

| Metric | Value |
|---|---|
| Now | 212 |
| 7-day average | 220 |
| All-time peak | **564** |
| Uptime (7d) | 100% |
| Yesterday (Nov 7) avg / peak | 228.7 / 401 |
| Nov 1 avg / peak | 247.4 / 452 |
| Today so far | 119.4 avg (partial day) |

Busiest around **09:00 EST**, quietest around **19:00 EST** (per one tracker — i.e. prime-time India).

---

## 2. DNS & infrastructure

**DNS is entirely on Cloudflare.**

```
NS:   angelina.ns.cloudflare.com
      ben.ns.cloudflare.com
MX:   route1/2/3.mx.cloudflare.net   (Cloudflare Email Routing — no real mailboxes exposed)
SRV:  _minecraft._tcp.insanesmp.net  pri 5, weight 5 → play.insanesmp.net:25565  (TTL 300)
A:    play.insanesmp.net             → 155.103.48.224                             (TTL 300)
ANY:  RFC8482 (Cloudflare minimal-ANY policy)
```

**Network**

| Field | Value |
|---|---|
| IP | `155.103.48.224` |
| ASN | **AS216382** |
| Org / ISP | **LAYER MARKETING SERVICES L.L.C** ("Layer", `layer.ae`) |
| Location (ipinfo/ipwhois) | **Singapore** — lat 1.29, lon 103.85 |
| Timezone | Asia/Singapore (+08) |

**Geo mismatch worth knowing:** two independent listing services place this server in **Jaipur, Rajasthan, India** on **"Advika Web Developments Hosting Pvt Ltd"** — while IP geolocation says **Singapore, AS216382 Layer Marketing Services L.L.C.** Both can be true: an Indian host reselling Singapore capacity, or an Indian-owned box in a Singapore DC (common for Indian gaming servers to get better regional routing/latency and cheaper bandwidth). Measured ping supports Singapore: **16 ms from Singapore**, 78 ms Tokyo, 113 ms Hong Kong, ~156 ms Frankfurt, ~175 ms Sydney.

Because the game server sits on a **raw IP behind Cloudflare DNS only** (not Cloudflare's proxy), a determined person can find and directly target `155.103.48.224` — there's no DDoS shield in front of 25565. That's normal for Minecraft but worth stating.

---

## 3. Identity, community, business

**Brand:** "**Insane Network**" / "InSane SMP" — tagline *Play your way*. The site is a custom Next.js app at `www.insanesmp.net` (note: the **apex** `insanesmp.net` returns HTTP 500; only `www` serves the site).

**History**
- **Founded August 2021** as a public survival server under "InSane Studios".
- **Discord created 2022-03-06** (08:45 UTC).
- Site's own blog/listing material dates the 2026 expansion into a Java+Bedrock "network" with Survival / Economy / Practice.

**Ownership — conflicting signals, treat as unresolved:**

| Source | Claim |
|---|---|
| `minecraftiplist.com` listing | Owner: **"gautam"** |
| `minecraft-mp.com` listing | "Registered By **theGautam**", since 27 Aug 2025 |
| Official site Patrons leaderboard | **#8 patron is `GAUTAM`** |
| `minecraftservers.org` #686198 | Owner: `valiantphalanx`, US, `exaroton.me` host — **almost certainly a different server reusing the name**; ignore |

The consistent thread is a player named **Gautam/theGautam** (also `GAUTAM` on the patron board). The `valiantphalanx` entry is a separate, unrelated "Insane SMP" that listing aggregators have mis-merged with this one. There is no confirmed public real-name owner.

**Discord — `discord.gg/insanesmp`** (verified via public invite API)

| Field | Value |
|---|---|
| Guild | **InSane SMP** |
| Guild ID | `949950892008951838` |
| Members | **11,082** |
| Online now | **404** |
| Boosts | 27 (Tier 3) |
| Created | **2022-03-06** |
| Vanity | `insanesmp`, tag `ISMP` |
| Verification level | 1 (low) — gate enabled but permissive |
| Description | "…forge powerful alliances, build mega-bases, dominate the economy, or battle it out in intense PvP… survival, economy and practice servers experience." |
| Notable | Your invite profile carries the custom tag **`insanesmp.net`**; server has **game activity** linked (app `1402418491272986635` — the same app id shown on DonutSMP's guild, i.e. a shared Minecraft-activity integration, not an ownership link) |

**Store**

- URL: `www.insanesmp.net/store` — the page renders as a **client-side app** and returns no text to a fetcher, so exact line-item prices could not be extracted.
- Legacy Tebex: `insanesmp.tebex.io` still exists but says **"This webstore is currently unavailable"** → they've moved off Tebex to their own/storefront integration.
- What *is* confirmed:
  - Categories: **Ranks · Coins · Permanent ranks**, plus **Practice ranks**.
  - Ranks range **VIP → MVP+** (per the listing metadata).
  - **“Diwali Sale — 20% OFF EVERYTHING”** was live at snapshot, timer showing **~3d 06h** remaining → ends roughly **11 Nov 2026**.
  - Store is described as **no-pay-to-win**, with ranks also obtainable free by playing; purchases **generally non-refundable** (narrow duplicate/delivery exceptions). Support via Discord tickets.
  - Site shows a **Patrons** leaderboard (5 pages, ~27 per page = **roughly 120+ paying supporters**), top names: `Ganeshbhaiya67`, `DOMRAJBHAI1GOD`, `Nether_knight67`, `R24_Gaming`, `MinerTalksXD`. Spending amounts are hidden ("spending private").

**Currency & audience:** predominantly **Indian** player base (names in the patron and Elo lists are heavily Indian, e.g. `Ganeshbhaiya67`, `R24_Gaming`, `shivansh_14`, `Tanveerskpro`). Primary language English. Prices are likely INR-denominated despite third-party listings quoting USD.

---

## 4. What the server actually is

**Type:** Classic **semi-vanilla survival SMP** with a player-run economy — Java + Bedrock crossplay, one shared world, no lobby. Explicitly **no land claiming**: your base is only as safe as you make it, and **raiding/griefing is allowed by design**.

**Three modes on the network**
1. **Survival** — the main world. Mine, farm, explore, build; PvP is on and raiding is a legitimate way to get ahead.
2. **Economy** — player-driven market: `/ah` auction house, player shops, direct trading. Currently promoting "**✦ Free spawner in Economy in 24 hours**" in the MOTD/listing.
3. **Practice** — a separate PvP training hub with preset kits, duels and Crystal PvP practice.

**Practice ladder (live from `/tiers`)**
- **3,948 ranked players**
- Ladders detected from the kit icons/columns: **Overall, Sword, Axe, Mace, Spear, Golden Apple, Netherite (pot), Potion, Splash Potion, Ender Pearl, Crystal, TNT Minecart** — i.e. a full CPvP-oriented kit set including the modern **Mace** and **netherite spear** items
- Tier bands: **LT2–LT3, MT2–MT3, HT2–HT4, Unplaced** (low/mid/high, 2–4 sub-tiers)
- Current top of the ladder:

| # | Player | Avg Elo | W/L | Winrate |
|---|---|---|---|---|
| 1 | **SUNG_SUHU** | 1512 | 72/1 | 99% |
| 2 | **N3zuxX_** | 1351 | 106/13 | 89% |
| 3 | **flamefoxxx** | 1302 | 50/8 | 86% |
| 4 | NinjaHuz | 1273 | 25/1 | 96% (LT3) |
| 5 | mgaminz | 1268 | 18/0 | 100% (LT3) |

Note `SUNG_SUHU` at **72–1** and `mgaminz` at **18–0** — either genuinely strong or an alt-farming artefact; worth knowing if you care about ladder integrity.

**Public infrastructure on the website (unusual and good practice):**
- **`/punishments`** — a public ban/mute/punishment log exists (server-side rendered but returned empty to a fetcher; it's live for browsers).
- **`/tiers`** — public PvP Elo ladder, 3,948 players.
- **`/patrons`** — public donor leaderboard.
- **`/store`** — shop.
- **`/robots.txt`** and **`/sitemap.xml`** both 404 — no SEO scaffolding, minor sloppiness.

---

## 5. Reputation & red flags

| Signal | Assessment |
|---|---|
| Uptime | **100%** over 7 days per one tracker; another shows 57–86% historically → the server has had rough patches |
| Advertising honesty | **"No pay to win" + "ranks are free"** yet the store sells ranks, coins, crate keys and "permanent ranks". Coins and keys are *direct* power purchases — the "no P2W" claim does not hold up |
| Refunds | Explicitly **all sales final**. On an Indian-operated storefront with no visible business entity, that's a real risk if delivery fails |
| Listing hygiene | Multiple aggregators carry **wrong owner, wrong country, wrong hardware** for this IP. Anyone "researching" this server from listings is being fed fiction |
| Bedrock | Advertised everywhere, **not answering at snapshot** |
| Apex domain | `insanesmp.net` returns **HTTP 500**; only `www` works |
| DDoS posture | Origin IP exposed, no proxy in front of 25565 |
| Verification level on Discord | 1 (low) on an 11k-member server |

No evidence of malware, scams, or credential harvesting tied to the domain. The risk profile is the normal "small monetised Minecraft server" one: over-claimed anti-P2W marketing, non-refundable purchases, and an operator whose legal identity isn't published.

---

## 6. How to join

**Java**
1. Multiplayer → Add Server
2. Address: `insanesmp.net` (or `play.insanesmp.net`)
3. Join on **26.3** (or whatever the launcher's current release is — Paper 26.3, protocol 777)

**Bedrock / console / mobile**
- Address `insanesmp.net`, port **19132** — *but verify first; it was refusing connections at snapshot.*

**First moves:** `/ah` to check auction prices, `/sell` or a player shop to earn, get far from spawn before building (no land claims, raiding allowed), and use **Practice** to learn crystal/mace PvP before risking your loot in survival.

---

## 7. Quick reference

```
Java IP:      insanesmp.net  (SRV → play.insanesmp.net:25565)
Direct IP:    155.103.48.224:25565
Bedrock IP:   insanesmp.net:19132   ← advertised, NOT responding at snapshot
Version:      Paper 26.3 (protocol 777)
Players:      ~213–226 / 500   |   7d avg 220   |   all-time peak 564
Hosting:      AS216382 LAYER MARKETING SERVICES L.L.C — Singapore
              (listings claim Jaipur, Rajasthan, India — Advika Web Developments)
DNS:          Cloudflare (angelina/ben.ns.cloudflare.com), MX via CF Email Routing
Owner:        unclear — "Gautam"/theGautam/GAUTAM across sources; founded Aug 2021
Discord:      discord.gg/insanesmp — 11,082 members, 404 online, Tier 3, est. 2022-03-06
Store:        www.insanesmp.net/store — Ranks (VIP→MVP+), Coins, Permanent ranks,
              Practice ranks; "Diwali Sale 20% off" ends ~11 Nov 2026; no refunds
Practice:     3,948 ranked players; Elo ladder incl. Mace, Spear, Crystal, TNT
Genre:        Semi-vanilla survival SMP + player economy + CPvP practice hub
              No land claims, raiding allowed, crossplay Java+Bedrock
```

### Comparison with DonutSMP

| | DonutSMP | InSane SMP |
|---|---|---|
| Players | ~18,800 / 50,000 | ~220 / 500 |
| Software | Velocity proxy, 6 regions, own ASN | Single Paper node, Singapore |
| Region | Virginia, US (anycast) | Singapore (Indian operator/audience) |
| Discord | 1.05M members | 11k members |
| Model | Semi-anarchy, base hunting, huge economy | Semi-vanilla survival, no land claims, raiding allowed |
| Standout | Scale; custom economy systems | Public Elo ladder + public punishment log |
