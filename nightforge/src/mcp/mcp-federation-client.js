/**
 * NIGHTFORGE — Multi-Server MCP Federation Client
 * Connects simultaneously over real Model Context Protocol stdio transports to:
 *  1. `nightforge-mcp` (16 Autonomous Engineering, Blueprint, Bulk, Vision & Verification tools)
 *  2. `yuniko-minecraft-mcp` (22 Upstream Embodied Character, Survival & Chat tools)
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');

export class NightforgeMcpFederation {
  constructor({ host = '127.0.0.1', port = 25565, version = '1.16.5' } = {}) {
    this.host = host;
    this.port = String(port);
    this.version = version;
    this.clients = new Map();
    this.transports = new Map();
    this.toolCatalog = new Map(); // serverName -> tool[]
  }

  async connectServer(name, { command, args, env }) {
    const transport = new StdioClientTransport({
      command,
      args,
      env: { ...process.env, ...env },
      stderr: 'pipe'
    });
    const client = new Client(
      { name: 'nightforge-federation-orchestrator', version: '1.0.0' },
      { capabilities: {} }
    );
    await client.connect(transport);
    const listed = await client.listTools();
    this.clients.set(name, client);
    this.transports.set(name, transport);
    this.toolCatalog.set(name, listed.tools || []);
    return listed.tools || [];
  }

  async connectAll({ includeYuniko = true } = {}) {
    await this.connectServer('nightforge-mcp', {
      command: 'node',
      args: [path.join(repoRoot, 'nightforge/src/mcp/nightforge-mcp-server.js')],
      env: {
        MC_HOST: this.host,
        MC_PORT: this.port,
        MC_USERNAME: 'NightforgeBot',
        MC_VERSION: this.version
      }
    });

    if (includeYuniko) {
      const yunikoEntry = path.join(repoRoot, '.cache/vendor/minecraft-mcp-server/dist/main.js');
      await this.connectServer('yuniko-minecraft-mcp', {
        command: 'node',
        args: [
          yunikoEntry,
          '--host', this.host,
          '--port', this.port,
          '--username', 'SurveyBot'
        ],
        env: {}
      });
    }

    return this.getFederationSummary();
  }

  getFederationSummary() {
    const servers = {};
    let totalTools = 0;
    for (const [srv, tools] of this.toolCatalog.entries()) {
      servers[srv] = {
        toolCount: tools.length,
        tools: tools.map(t => t.name)
      };
      totalTools += tools.length;
    }
    return { totalConnectedServers: this.clients.size, totalTools, servers };
  }

  async callTool(serverName, toolName, args = {}) {
    const client = this.clients.get(serverName);
    if (!client) throw new Error(`MCP server '${serverName}' is not connected`);
    const raw = await client.callTool({ name: toolName, arguments: args });
    const text = raw?.content?.map(c => c.text || '').join('\n') || '';
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
    return {
      isError: Boolean(raw?.isError),
      rawText: text,
      data: parsed
    };
  }

  async closeAll() {
    for (const [, transport] of this.transports.entries()) {
      try {
        await transport.close();
      } catch {}
    }
    this.clients.clear();
    this.transports.clear();
  }
}
