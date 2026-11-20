# PHASE 1 — ENVIRONMENT & TOOL DISCOVERY REPORT

**Timestamp:** 2026-11-20 UTC  
**Workspace Root:** `/home/user/Experiments-`  
**Git Branch:** `arena/9d5f1645-experiments` (active, branched from `ec8e603`)

---

## 1. Host Agent Mode vs. Workspace MCP Capability Audit

### 1.1 Arena Host-Level Connectors & Agent Tools
- **Host Agent Native Tools:** `bash`, `read_file`, `write_file`, `edit_file`, `start_process`, `get_process_output`, `stop_process`, `web_search`, `fetch_page`, `image_search`, `generate_image`, `present_file`, `ask_user`, `list_connector_tools`, `call_connector_tool`.
- **Host-Level Connected Apps (Managed Externally by Arena UI):** `dropbox`, `google_calendar`, `google_docs`, `google_drive`, `google_sheets`, `google_slides`, `linear`, `notion`, `supabase`, `vercel`.
- **Minecraft-Specific Host Connectors:** **None.** None of the 10 Arena platform connectors are Minecraft servers or Minecraft MCP integrations, and host-level tool declarations cannot be dynamically injected into Arena's top-level schema from inside the Linux container.

### 1.2 Workspace-Level MCP Server Installation & Connection (Supported & Active)
- **Can additional MCP servers be installed and connected inside the workspace?** **YES.**
- Using `@modelcontextprotocol/sdk` (`^1.27.1`) over `StdioClientTransport` (and HTTP/SSE where needed), the Nightforge orchestrator inside `/home/user/Experiments-/nightforge` installs, launches, handshakes (`initialize`, `tools/list`, `tools/call`), and federates multiple real MCP servers directly as child stdio processes.
- Standard MCP client configuration (`mcp.config.json`) is also generated at the repository root so external MCP hosts (Claude Desktop, Cursor, VS Code Copilot Agent Mode, Windsurf, Cline) can mount the exact same MCP servers without modification.

---

## 2. System, Runtime & Tooling Inventory

| Subsystem | Observed State | Details & Verification |
|---|---|---|
| **OS & Kernel** | Linux `6.1.158+` x86_64 | Debian 12 environment (`e2b.local`), 2 vCPUs, 3.8 GiB RAM (3.6 GiB free), 20 GiB free disk |
| **Terminal / Shell** | `/bin/bash` + background processes | One-shot `bash` tool + persistent `start_process` / `get_process_output` / `stop_process` |
| **Node.js & npm** | Node `v22.22.3`, npm `10.9.8`, npx `10.9.8` | Full ES Module & TypeScript (`tsx` / `tsc`) support; verified with `@modelcontextprotocol/sdk` and `mineflayer` |
| **Python** | Python `3.11.2`, `pip 23.0.1` | Installed `Pillow 13.0.0` and `numpy 2.4.6` for image/video-frame architectural analysis |
| **Java / OpenJDK** | Not installed (`java: command not found`) | Cannot launch JVM-based PaperMC/Fabric server JARs directly inside this sandbox without outbound APT mirrors; solved via pure-JS `flying-squid` Java Edition server |
| **Display / GPU** | Headless (`xvfb-run` & `ffmpeg` not installed) | WebGL-dependent `prismarine-viewer` headless Chromium/gl bindings require X11/OpenGL; solved via pure-software shaded 3D isometric + orthographic voxel PNG renderer (`pngjs`) |
| **Git & GitHub CLI** | `git 2.39.5`, `gh 2.23.0` | Authenticated and verified against `api.github.com` and `github.com` |
| **Archive / Build Tools** | `zip 3.0`, `gcc`, `g++`, `make`, `jq`, `curl`, `wget` | Full support for packaging `minecraft-skills.zip` |
| **File Access** | Full R/W in `/home/user/Experiments-` | Persisted across turns; `.gitignore` configured to exclude `node_modules/` and runtime chunk caches |

---

## 3. Network & Minecraft Server Access Audit

### 3.1 Outbound Network Allowlist
Verified via `curl` probes:
- `https://registry.npmjs.org` — **HTTP 200 OK** (npm package installation works)
- `https://pypi.org` & `https://files.pythonhosted.org` — **HTTP 200 OK** (pip package installation works)
- `https://github.com`, `https://api.github.com`, `https://codeload.github.com` — **HTTP 200 OK** (Git clone & GitHub REST API inspection work)
- Arbitrary external hosts (e.g., `piston-meta.mojang.com` or external game server IPs) — **Blocked by sandbox firewall**.

### 3.2 Minecraft Server Access
- **Pre-existing running Minecraft server on sandbox:** None (`ss -tulpn` showed only system ports `22`, `111`, `323`, `49983` at startup).
- **Pre-existing Minecraft skills in repository:** None (initial repository contained only `# Experiments-` in `README.md`).
- **Live Local Minecraft Server Solution:** Installed and verified **`flying-squid` (`1.12.0`)**, PrismarineJS's pure-Node.js Minecraft Java Edition `1.16.5` TCP protocol server (`online-mode: false`), augmented with custom modern blockstate (`/setblock`, `/fill`) and WorldEdit-compatible (`//pos1`, `//pos2`, `//set`, `//walls`, `//replace`, `//undo`) server plugins.
- **External Server Portability:** When run outside the sandbox (or on any machine with LAN/WAN access), setting `MC_HOST`, `MC_PORT`, `MC_USERNAME`, and `MC_VERSION` connects the exact same Nightforge MCP Server and Mineflayer agent to any Vanilla, Paper, Spigot, Purpur, or Fabric server (`1.8.8` – `1.21.11`).
