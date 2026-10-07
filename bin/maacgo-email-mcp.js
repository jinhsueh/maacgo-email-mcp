#!/usr/bin/env node
// @maacgo/email-mcp — stdio MCP server for MAAC Go Email.
//
// Client config (Claude Code / Claude Desktop / Cursor / Windsurf / Codex):
//   {
//     "mcpServers": {
//       "maacgo-email": {
//         "command": "npx",
//         "args": ["-y", "@maacgo/email-mcp"],
//         "env": { "MAACGO_EMAIL_API_KEY": "sk_live_..." }
//       }
//     }
//   }
//
// Env:
//   MAACGO_EMAIL_API_KEY  required — an API key from the Developers page
//   MAACGO_EMAIL_BASE_URL optional — override the REST base
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { TOOLS, TOOL_BY_NAME, makeClient, toMcpToolResult, formatToolError, publicTool, missingArgs, SERVER_INSTRUCTIONS, SERVER_NAME, SERVER_TITLE, SERVER_VERSION } from '../tools.js';

const apiKey = process.env.MAACGO_EMAIL_API_KEY || process.env.CRESCLAB_API_KEY;
if (!apiKey) {
  console.error('✗ MAACGO_EMAIL_API_KEY not set. Create one at https://edm.cresclab.com/developers');
  process.exit(1);
}

const call = makeClient({ apiKey, baseUrl: process.env.MAACGO_EMAIL_BASE_URL });
const server = new Server({ name: SERVER_NAME, title: SERVER_TITLE, version: SERVER_VERSION }, { capabilities: { tools: {} }, instructions: SERVER_INSTRUCTIONS });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map(publicTool),
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const tool = TOOL_BY_NAME[req.params.name];
  if (!tool) return { isError: true, content: [{ type: 'text', text: 'unknown tool: ' + req.params.name }] };
  const missing = missingArgs(tool, req.params.arguments);
  if (missing.length) return { isError: true, content: [{ type: 'text', text: `${tool.name} needs ${missing.join(', ')}.` }] };
  try {
    return toMcpToolResult(await tool.handler(call, req.params.arguments || {}));
  } catch (e) {
    return { isError: true, content: [{ type: 'text', text: formatToolError(tool.name, e) }] };
  }
});

await server.connect(new StdioServerTransport());
console.error('[maacgo-email-mcp] ready · ' + TOOLS.length + ' tools · key mode: ' + (apiKey.startsWith('sk_test_') ? 'TEST (records only, never delivers)' : 'live'));
