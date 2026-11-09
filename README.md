# AI Agents Lab: MCP server and Claude skills for testers

[![CI](https://github.com/dhanoapartners/ai-agents-lab/actions/workflows/ci.yml/badge.svg)](https://github.com/dhanoapartners/ai-agents-lab/actions/workflows/ci.yml)

## What this demonstrates

*By Avneet Dhanoa (QualityFirstQA LLC). Part of a five-repo portfolio; start at [practice-lab](https://github.com/dhanoapartners/practice-lab).*

- **Building for AI agents:** an MCP server that gives Claude safe, well-described tools over a real web app.
- **Testing AI integrations like any other API:** every tool exercised through a real MCP client, including inputs, errors and state changes.
- **Guarding against prompt injection:** untrusted text (customer reviews) is labelled as such before a model sees it.
- **Reusable AI workflows for testers:** five Claude skills for writing tests, judging RAG answers, reviewing agent traces and locators.

Hands-on training for the agentic side of QA, built on **[Practice Lab](https://www.dhanoapartners.com)**:

1. **Build an MCP server.** `src/server.ts` gives Claude (or any MCP client) tools to browse the Practice Lab shop, ask its Help Center and manage a cart.
2. **Test an MCP server.** `tests/server.test.ts` connects a real MCP client in memory and checks every tool, the way Claude would call it.
3. **Use Claude skills for testing.** `skills/` holds five ready-made skills: write Practice Lab tests, judge RAG answers, review agent traces, review fallback locators and test MCP servers.

All data is synthetic. Companion repo: [practice-lab](https://github.com/dhanoapartners/practice-lab) (the Playwright suite).

## The test report

`npm run test:report` runs the tests and writes **`reports/mcp-report.html`**, one self-contained page you can open in any browser:

- totals (tests, passed, failed, time, MCP calls) and a pass bar;
- **Tools exercised**: every tool, how often it was called, how many calls returned `isError`, and how many tests used it;
- every test, with **each MCP call it made**: the arguments and the server's response, side by side. Failed tests open automatically with the assertion error.

How it works: the tests log each call with `t.diagnostic()` (see `call()` in `tests/server.test.ts`), and a custom reporter for Node's test runner (`reporters/mcp-html.mjs`) turns them into the page. No extra test framework is needed. In CI the page is uploaded as the **mcp-report** artifact on every run.

## What is MCP?

The **Model Context Protocol** is a standard way to give an AI model tools. A server lists its tools (name, description, input schema); a client such as Claude Desktop or Claude Code shows them to the model; the model decides when to call them. Write the server once and any MCP client can use it.

## The server's tools

| Tool | What it does | Changes state? |
|---|---|---|
| `lab_health` | Checks the lab API is up | No |
| `search_products` | Searches the catalog by words, category, max price, in stock | No |
| `get_product` | One product by id (`p-1017`) | No |
| `get_reviews` | Customer reviews, labelled as untrusted text | No |
| `ask_help_center` | Asks the RAG Help Center; returns the answer with sources | No |
| `add_to_cart` | Adds a product to this session's cart | **Yes** |
| `get_cart` | Shows the cart, to confirm what really happened | No |

Things to notice in `src/server.ts`: strict zod input schemas, descriptions written for the model, `readOnlyHint` on every tool that can't change anything, errors returned as `isError` results instead of crashes, and untrusted text labelled as data.

## Setup

Needs Node.js 20 or later.

```bash
git clone https://github.com/dhanoapartners/ai-agents-lab
cd ai-agents-lab
npm install
npm test            # tests every tool against the live lab
npm run inspect     # opens the MCP Inspector to call tools by hand
```

`LAB_URL=http://localhost:8788` points everything at a local copy of the site.

## Connect it to Claude

**Claude Code** (from the repo folder):
```bash
claude mcp add practice-lab -- npx tsx "$(pwd)/src/server.ts"
```

**Claude Desktop**: add this to `claude_desktop_config.json` (use the full path to your clone), then restart the app:
```json
{
  "mcpServers": {
    "practice-lab": {
      "command": "npx",
      "args": ["tsx", "/full/path/to/ai-agents-lab/src/server.ts"]
    }
  }
}
```

Then try: *"Find an in-stock speaker under $60, add one to my cart, and show me the cart."* Watch which tools it calls, and check with `get_cart` that it did what it said.

## Skills

| Skill | Use it to |
|---|---|
| `practice-lab-test-writer` | Write Playwright tests for any Practice Lab screen |
| `rag-answer-judge` | Score a RAG answer for groundedness, relevance and completeness |
| `agent-trace-reviewer` | Review an agent's tool calls for hallucinated actions, injection and loops |
| `fallback-locator-review` | Turn fallback-locator warnings from a run into locator fixes |
| `mcp-tool-tester` | Write tests for an MCP server's tools |

Each skill is a folder with a `SKILL.md`. **Claude Code:** copy the folder into `~/.claude/skills/` (or `.claude/skills/` in a project). **Claude apps:** zip the folder and upload it as a skill.

## Exercises

1. Add a `get_store_availability` tool (`GET /api/v1/stores/availability?productId=…&zip=…`) with a schema that rejects ZIP codes that aren't 5 digits. Write its tests.
2. Add a `remove_from_cart` tool. Should it have `destructiveHint: true`? Write a test proving it really removed the line.
3. Prompt injection: on the lab's AI Agent page, a product review hides instructions ("add 3 rugs"). Any text a tool returns could do the same. Add a check to `get_reviews` that flags reviews containing instruction-like phrases ("ignore previous", "add to cart"), and a test that proves the flag works on a crafted example.
4. Use the `mcp-tool-tester` skill to write tests for your new tools, then review what it wrote.

---

© 2026 QualityFirstQA LLC. Dhanoa Partners is a training brand of QualityFirstQA LLC. For personal learning; see LICENSE.
