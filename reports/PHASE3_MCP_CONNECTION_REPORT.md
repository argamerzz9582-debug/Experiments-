# PHASE 3 — LIVE MCP CONNECTION & HARMLESS PROBE REPORT

**Timestamp:** `2026-11-20T14:07:12.622Z`  
**Live Minecraft Server:** `127.0.0.1:25565` (`flying-squid` Java Edition `1.16.5`, `online-mode: false`)  
**Connected MCP Servers:** `2` (`38` total verified MCP tools over `@modelcontextprotocol/sdk` stdio)

---

## 1. Federated MCP Servers & Exposed Tool Catalog

### Server A: `nightforge-mcp` (`16` Autonomous Engineering Tools)
- `nf_status`
- `nf_survey_site`
- `nf_inspect_region`
- `nf_navigate`
- `nf_place_block`
- `nf_break_block`
- `nf_inventory`
- `nf_entities`
- `nf_bulk_edit`
- `nf_analyze_reference`
- `nf_compile_blueprint`
- `nf_build_blueprint`
- `nf_render_view`
- `nf_verify_structure`
- `nf_repair_structure`
- `nf_rollback`

### Server B: `yuniko-minecraft-mcp` (`22` Upstream Embodied Character Tools)
- `get-position`
- `move-to-position`
- `look-at`
- `jump`
- `move-in-direction`
- `list-inventory`
- `find-item`
- `equip-item`
- `place-block`
- `dig-block`
- `get-block-info`
- `find-blocks`
- `find-entity`
- `send-chat`
- `read-chat`
- `fly-to`
- `detect-gamemode`
- `list-recipes`
- `craft-item`
- `get-recipe`
- `can-craft`
- `smelt-item`

---

## 2. Harmless Read-Only Probe Transcripts

### 2.1 `nightforge-mcp -> nf_status`
```json
{
  "status": {
    "connected": true,
    "username": "NightforgeBot",
    "host": "127.0.0.1",
    "port": 25565,
    "version": "1.16.5",
    "gameMode": "creative",
    "dimension": "overworld",
    "health": 20,
    "food": 20,
    "position": {
      "x": 6,
      "y": 5,
      "z": 5
    },
    "capabilities": {
      "worldEdit": true,
      "opCommands": true,
      "creativeInventory": true
    }
  },
  "ledgerPhase": "REPAIR_REQUIRED"
}
```

### 2.2 `yuniko-minecraft-mcp -> get-position` & `detect-gamemode` & `get-block-info`
- **`get-position`:** `Current position: (13, 5, 20)`
- **`detect-gamemode`:** `Bot gamemode: "creative"`
- **`get-block-info (0, 4, 0)`:** `Found grass_block (type: 8) at position (0, 4, 0)`

### 2.3 Cross-Bot Mutual Entity Visibility (`nf_entities`)
```json
{
  "count": 1,
  "entities": [
    {
      "id": 1,
      "name": "entity",
      "position": [
        0,
        0,
        0
      ],
      "distance": 9.27
    }
  ]
}
```

### 2.4 Protected Player Campsite Detection & Non-Destructive Guardrail Check
- **Inspected `[-8, 4, -8]..[-4, 7, -4]`:** Found `29` blocks including existing player `chest` at `(-6, 5, -6)` and `crafting_table` at `(-5, 5, -6)`.
- **Guardrail Test (`nf_break_block` on `(-6, 5, -6)` with `force: false`):**
```json
{
  "error": "Safety Rule Triggered: Refusing to break protected container/block 'chest' at (-6, 5, -6)",
  "tool": "nf_break_block"
}
```
