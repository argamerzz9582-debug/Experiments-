# NIGHTFORGE — Autonomous Minecraft Engineering Skill Library (`minecraft-skills`)

`minecraft-skills/` is a modular, production-ready library of **17 specialized autonomous engineering skills** plus a master orchestration specification (`MASTER_AGENT.md`) designed for MCP-enabled coding and embodied game agents (Arena Agent Mode, Claude Code, Claude Desktop, Cursor, VS Code Copilot, Windsurf, and custom MCP orchestrators).

---

## Directory Structure

```text
minecraft-skills/
├── MASTER_AGENT.md                      # Master orchestration doctrine, coordinate laws, ledger & safety protocol
├── README.md                            # Skill catalog, MCP configuration & execution guide
└── skills/
    ├── world-surveyor/SKILL.md          # Terrain heightmaps, biome inspection, build-site scoring & hazard detection
    ├── reference-analyzer/SKILL.md      # Architectural image & video-frame proportion, silhouette & feature extraction
    ├── architect/SKILL.md               # Structural massing, floor heights, symmetry, circulation & facade rules
    ├── blueprint-planner/SKILL.md       # Coordinate mapping, floor/elevation/roof plans, BOM & topological staging
    ├── block-palette-expert/SKILL.md    # Material harmony, weathering gradients, blockstate compatibility & fallbacks
    ├── terrain-engineer/SKILL.md        # Cut-and-fill grading, natural slope blending, retaining walls & water clearing
    ├── foundation-builder/SKILL.md      # Sub-grade footings, plinths, crawlspaces, pier-and-beam & level floor slabs
    ├── structural-builder/SKILL.md      # Timber/stone framing, load-bearing pillars, walls, floors & staircases
    ├── roof-specialist/SKILL.md         # Gable, hip, mansard, gambrel, A-frame, conical tower & dormer geometry
    ├── interior-designer/SKILL.md       # Room zoning, ergonomics, multi-floor circulation, furniture & lighting >= 8
    ├── landscaping/SKILL.md             # Courtyards, pathways, custom flora, retaining terraces & perimeter lighting
    ├── pathfinding-expert/SKILL.md      # Mineflayer-pathfinder A*, scaffolding, reach positioning & Baritone fallbacks
    ├── worldedit-engineer/SKILL.md      # Safe WorldEdit/FAWE & vanilla /fill batching, greedy box decomposition & undo
    ├── detail-artist/SKILL.md           # Depth layering, shutter/trim blockstates, chimneys, banners & micro-texturing
    ├── build-verifier/SKILL.md          # 12-point live-world inspection, blockstate diffing, BFS walkability & vision
    ├── repair-agent/SKILL.md            # Root-cause defect triage, bottom-up surgical reconstruction & re-verification
    └── recovery-agent/SKILL.md          # Connection drop recovery, chunk reload, entity clearing & snapshot rollback
```

---

## Skill Contract Standard

Every `SKILL.md` in `skills/<skill-name>/SKILL.md` implements nine mandatory operational sections:
1. **Role** — Precise domain boundary and ownership within the Nightforge pipeline.
2. **Capabilities** — Concrete engineering tasks the skill executes.
3. **Tools** — Exact MCP tools (`nightforge-mcp` and `yuniko-minecraft-mcp`), CLI scripts, and server commands used.
4. **Workflow** — Step-by-step deterministic execution sequence.
5. **Decision Rules** — Quantitative thresholds, geometric formulas, and tool-routing heuristics.
6. **Safety Rules** — Non-destructive checks, container/player-build protection, and bounding-box caps.
7. **Failure Handling** — Error diagnosis, partial-execution inspection, and safe retry logic.
8. **Verification** — Objective pass/fail assertions required before advancing the ledger.
9. **Fallback Strategies** — Degraded-mode execution when WorldEdit, creative mode, op permissions, or specific blocks are unavailable.

---

## Quick Integration with MCP Clients

Mount the federated MCP servers in your MCP client config (see `/mcp.config.json` in the repository root):

```json
{
  "mcpServers": {
    "nightforge-mcp": {
      "command": "node",
      "args": ["./nightforge/src/mcp/nightforge-mcp-server.js"],
      "env": {
        "MC_HOST": "127.0.0.1",
        "MC_PORT": "25565",
        "MC_USERNAME": "NightforgeBot",
        "MC_VERSION": "1.16.5"
      }
    },
    "yuniko-minecraft-mcp": {
      "command": "node",
      "args": [
        "./.cache/vendor/minecraft-mcp-server/dist/main.js",
        "--host", "127.0.0.1",
        "--port", "25565",
        "--username", "SurveyBot"
      ]
    }
  }
}
```
