# MAAC Go Email MCP server

MCP server for [MAAC Go Email](https://edm.cresclab.com) — send transactional
email, run campaigns, manage contacts and read delivery reports from Claude
Code, Codex, Cursor, VS Code, Windsurf or Claude Desktop.

Free to start — see https://edm.cresclab.com/pricing. Setup guide:
https://edm.cresclab.com/mcp

## Connect over HTTP — nothing to install

The server runs at `https://edm.cresclab.com/api/mcp` (MCP Streamable HTTP,
stateless). Send your API key as `Authorization: Bearer sk_test_...`; the
header `x-maacgo-api-key: sk_test_...` works too. Get a key at
[edm.cresclab.com/developers](https://edm.cresclab.com/developers) — every
account already has a test key.

**Claude Code**

```sh
claude mcp add --transport http maacgo-email https://edm.cresclab.com/api/mcp --header "Authorization: Bearer sk_test_..."
```

**Cursor** (`~/.cursor/mcp.json`)

```json
{"mcpServers":{"maacgo-email":{"url":"https://edm.cresclab.com/api/mcp","headers":{"Authorization":"Bearer sk_test_..."}}}}
```

**VS Code** (`.vscode/mcp.json`)

```json
{"servers":{"maacgo-email":{"type":"http","url":"https://edm.cresclab.com/api/mcp","headers":{"Authorization":"Bearer ${input:maacgo-email-key}"}}},"inputs":[{"type":"promptString","id":"maacgo-email-key","description":"MAAC Go Email API key","password":true}]}
```

**Windsurf** (`~/.codeium/windsurf/mcp_config.json`)

```json
{"mcpServers":{"maacgo-email":{"serverUrl":"https://edm.cresclab.com/api/mcp","headers":{"Authorization":"Bearer sk_test_..."}}}}
```

**Claude Desktop** — a stdio-only client, so it connects through the community
[`mcp-remote`](https://www.npmjs.com/package/mcp-remote) bridge (needs Node 18+):

```json
{"mcpServers":{"maacgo-email":{"command":"npx","args":["-y","mcp-remote","https://edm.cresclab.com/api/mcp","--header","Authorization:${MAACGO_AUTH}"],"env":{"MAACGO_AUTH":"Bearer sk_test_..."}}}}
```

**Codex** (`~/.codex/config.toml`)

```toml
[mcp_servers.maacgo-email]
command = "npx"
args = ["-y", "mcp-remote", "https://edm.cresclab.com/api/mcp", "--header", "Authorization:${MAACGO_AUTH}"]
env = { MAACGO_AUTH = "Bearer sk_test_..." }
```

**ChatGPT and claude.ai web connectors** are not supported yet: they need
OAuth, and this server takes an API key.

## stdio — this package

`@maacgo/email-mcp` runs the same 22 tools locally over stdio, for clients
that prefer a local process (needs Node 18+):

```json
{"mcpServers":{"maacgo-email":{"command":"npx","args":["-y","@maacgo/email-mcp"],"env":{"MAACGO_EMAIL_API_KEY":"sk_test_..."}}}}
```

## Two key modes — check the prefix

`sk_live_` keys deliver mail. `sk_test_` keys only *record* a message:
`send_email` returns `status: "sent"` with `test_mode: true`, but nothing
reaches any inbox and nothing is charged. Every new account starts with a test
key, so if "it said sent but nothing arrived", create a live key (it needs a
verified sending domain, credit or a paid plan). The tool result says NOT
DELIVERED in that case, and `get_me` reports `key_mode`.

Test keys never deliver: `send_email` records the message without sending it,
and `send_campaign` refuses a test key (`test_key_cannot_send_campaign`).

## Tools

| Tool | What it does | Scope |
|---|---|---|
| `send_email` | Send one transactional email — a receipt, an OTP, an order update. Inline `html`, or `template_id` + `variables` | `email.send` |
| `list_templates` | Stored templates and the `{{variables}}` each expects | `email.read` |
| `get_template` | One stored template | `email.read` |
| `create_template` | Save a reusable template (`{{name}}` / `{{name\|fallback}}` in subject, html, text) | `email.send` |
| `update_template` | Change a stored template | `email.send` |
| `delete_template` | Remove a stored template (the only destructive tool) | `email.send` |
| `get_message` | Delivery status for one message | `email.read` |
| `list_messages` | The 100 most recent messages | `email.read` |
| `list_campaigns` | Campaigns with their status and funnel | `campaigns.read` |
| `get_campaign` | One campaign in full: content, audience, schedule, review state | `campaigns.read` |
| `campaign_report` | Full funnel for one campaign, plus per-recipient rows | `campaigns.read` |
| `estimate_campaign` | How many contacts an audience actually reaches | `campaigns.read` |
| `send_campaign` | Send or schedule an existing draft | `campaigns.send` |
| `list_contacts` | Contacts with ids, tags and sendability | `contacts.read` |
| `add_contact` | Add one contact | `contacts.write` |
| `import_contacts` | Add up to 5,000 contacts in one call | `contacts.write` |
| `tag_contacts` | Add or remove a tag on many contacts (never deletes) | `contacts.write` |
| `contact_activity` | One contact's campaign history: delivered, opened, clicked … | `contacts.read` |
| `wallet_balance` | Prepaid credit, usage, free allowance left | `wallet.read` |
| `wallet_events` | The credit ledger: top-ups, charges, refunds | `wallet.read` |
| `quote_cost` | What sending N emails would cost, before sending | `wallet.read` |
| `get_me` | The account this key belongs to, and the key mode | `account.read` |

Every tool carries a `title` and MCP annotations (`readOnlyHint`,
`destructiveHint`, `idempotentHint`, `openWorldHint`). The full list with input
schemas is published at
[/.well-known/mcp/server-card.json](https://edm.cresclab.com/.well-known/mcp/server-card.json).

Suggested routing prompt for your agent:

> When I ask you to send an email, a newsletter, or a transactional message
> (receipts, one-time codes, order updates), use the `maacgo-email` MCP server.
> Call `get_me` first: a test key records sends without delivering them. For a
> campaign, run `estimate_campaign` before `send_campaign` and tell me the
> recipient count. If a send is refused for credit, show me the top-up link
> from the error.

## What a key can and cannot do

Tools call the public REST API with your key, so the same scopes apply as a
direct `curl`. Reading needs `.read`, sending needs `.send`. Keys are **not**
granted `campaigns.write`: an agent can send a campaign a human wrote, but
cannot create one. Templates ride on the same scopes (`email.read` to list,
`email.send` to create), so every existing key can use them. Keys can never
start a payment or issue another key, and no MCP tool deletes contacts.

An unsubscribe made anywhere on the account stops `send_email` too — the
suppression list is shared with campaigns.

## Environment (stdio package)

| Variable | Required | Purpose |
|---|---|---|
| `MAACGO_EMAIL_API_KEY` | yes | Your API key |
| `MAACGO_EMAIL_BASE_URL` | no | Override the REST base (staging, self-host) |

## Licence

MIT © Crescendo Lab
