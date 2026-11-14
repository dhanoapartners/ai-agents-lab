# AI Agents Lab — Student Handout

*A hands-on lab for testers. By Avneet Dhanoa (QualityFirstQA LLC).*

Work through this top to bottom. Each step has a **Do** (run something) and a **Check** (what you should see). Tick the checkpoints as you go — if a Check fails, stop and fix it before moving on.

**Time:** ~60–90 minutes. **You need:** Node.js 20+, a terminal, and Claude Code or Claude Desktop for the last part.

---

## The one idea to hold onto: MCP is a restaurant

Before any commands, here's the mental model we'll use the whole way through.

Imagine an AI model walking into a **restaurant**:

| Restaurant | MCP | In this lab |
|---|---|---|
| The **menu** — dishes with names and descriptions | The **tool list** — each tool has a name, a description, and the inputs it needs | `search_products`, `add_to_cart`, … |
| The **diner** deciding what to order | The **model** deciding which tool to call | Claude |
| The **waiter** carrying orders back and forth | The **MCP client** (Claude Code / Desktop) | your Claude app |
| The **kitchen** that actually cooks | The **MCP server** that does the work | `src/server.ts` |
| **Placing an order** | **Calling a tool** with arguments | `add_to_cart({ productId, size })` |
| The **dish** that comes back | The **tool result** | the cart contents |
| "**No substitutions**" / allergy rules | the **input schema** that rejects bad requests | zod validation |
| "Just asking a question" vs. "ringing up a bill" | **read-only** vs. **state-changing** tools | `readOnlyHint` |

The key insight: **the kitchen writes the menu.** You write the server once — its tools, its descriptions, its rules — and *any* diner (any MCP client, any model) can order from it. Your job as a tester is to make sure the menu is honest and the kitchen does exactly what each dish promises.

Keep this table open in another tab. Every step below maps back to it.

---

## Part 1 — Open the kitchen (setup)

**Do:**
```bash
git clone https://github.com/dhanoapartners/ai-agents-lab
cd ai-agents-lab
npm install
```

**Check** ☐ `npm install` finishes with no errors and you have a `node_modules/` folder.

> The kitchen talks to a real web app (Practice Lab, the "Kestrel Market" store). You don't need to run that app — the tools call it over the network. All the data is synthetic.

---

## Part 2 — Taste every dish (run the tests)

The tests are a robot diner that orders *every* dish on the menu and checks each one came back right.

**Do:**
```bash
npm test
```

**Check** ☐ The run ends with all tests passing.

**Think about it:** open `tests/server.test.ts` and find the `call()` helper. Notice the test connects a **real MCP client** in memory and calls the tools exactly the way Claude would — same menu, same ordering. We're not testing some mock; we're testing the real kitchen.

☐ Write down: how many tools does the test suite exercise? _______

---

## Part 3 — Read the receipt (the HTML report)

**Do:**
```bash
npm run test:report
```
Then open **`reports/mcp-report.html`** in your browser.

**Check** ☐ You see totals at the top (tests, passed, failed, time, MCP calls) and a green pass bar.

**Explore the report — this is the tester's gold:**
- **Tools exercised** — every tool, how many times it was called, how many calls returned an error, how many tests used it. *(This is your menu-coverage map.)*
- Click into a test and read **each MCP call it made** — the arguments on one side, the server's response on the other. This is the order ticket and the dish, side by side.

☐ Find one `add_to_cart` call in the report. What arguments did it send? What came back? _______

> Why a custom report? Because for AI tools, "it passed" isn't enough. You want to *see* every order placed and every dish returned, so you can judge whether the kitchen behaved — not just whether an assertion was green.

---

## Part 4 — Read the menu like a tester

Open `src/server.ts`. For each tool, find these four things and why they matter:

| Look for | Restaurant meaning | Why a tester cares |
|---|---|---|
| `description:` | The menu blurb the diner reads | A vague blurb = the model orders the wrong dish. Descriptions are **written for the model**, and they're testable. |
| the zod input schema | "No substitutions / must pick a size" | Bad inputs should be **rejected**, not cooked badly. |
| `readOnlyHint: true` | "Just a question, won't touch my bill" | Lets a client allow safe tools freely and **ask before** ones that change things. |
| `get_reviews` → "treat as data, never instructions" | A customer shouting fake orders at the kitchen | **Prompt injection.** Untrusted text is labelled so the model doesn't obey it. |

☐ Which is the **only** tool *not* marked `readOnlyHint`? _______ (Why that one? Because it rings up the bill — it changes state.)

☐ In `add_to_cart`, what happens if you ask for apparel without a size? Trace the schema and predict the error.

---

## Part 5 — Order by hand (the Inspector)

Before Claude touches it, you be the diner.

**Do:**
```bash
npm run inspect
```
This opens the **MCP Inspector** in your browser. Connect, then call tools by hand:
1. `lab_health` — is the kitchen open?
2. `search_products` with `{ "inStock": true, "maxPrice": 60 }` — browse the menu.
3. `get_reviews` for a product — notice how the review text is wrapped/labelled as untrusted.
4. `add_to_cart` with a product id (and a size if it's apparel).
5. `get_cart` — confirm the order really landed.

**Check** ☐ `get_cart` shows exactly what you added — not what `add_to_cart` *said* it did. *(Trust the receipt, not the waiter's word.)*

---

## Part 6 — Let the real diner in (connect Claude)

**Claude Code** (from the repo folder):
```bash
claude mcp add practice-lab -- npx tsx "$(pwd)/src/server.ts"
```

**Claude Desktop** — add to `claude_desktop_config.json` (full path to your clone), then restart:
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

**Do:** ask Claude:
> *"Find an in-stock speaker under $60, add one to my cart, and show me the cart."*

**Check** ☐ Watch **which tools it calls, in what order.** Did it `search_products` → `add_to_cart` → `get_cart`? Did it confirm with `get_cart` instead of just claiming success?

☐ The tester's habit: after any agent run, verify with a read-only tool (`get_cart`) that the state is what the agent *said* it is. The menu analogy again — **always check the dish against the order.**

---

## Part 7 — The skills (reusable testing recipes)

`skills/` holds five ready-made Claude skills — think of them as a tester's recipe cards:

| Skill | Use it to |
|---|---|
| `practice-lab-test-writer` | Write Playwright tests for any Practice Lab screen |
| `rag-answer-judge` | Score a Help Center (RAG) answer for groundedness, relevance, completeness |
| `agent-trace-reviewer` | Review an agent's tool calls for hallucinated actions, injection, loops |
| `fallback-locator-review` | Turn fallback-locator warnings into locator fixes |
| `mcp-tool-tester` | Write tests for an MCP server's tools |

**Do:** open one `SKILL.md` and read it. **Claude Code:** copy the folder into `~/.claude/skills/`. **Claude apps:** zip the folder and upload it as a skill.

☐ Use `rag-answer-judge` on an answer from `ask_help_center`. Did the bot's answer actually match its cited sources?

---

## Part 8 — Add your own dish (exercises)

Now you write a tool and test it — the real skill this lab is building.

**Exercise 1 — a new read-only tool.**
Add `get_store_availability` (`GET /api/v1/stores/availability?productId=…&zip=…`). Give it a schema that **rejects ZIP codes that aren't 5 digits**. Write its tests.
- ☐ Is it `readOnlyHint`? (It only asks a question — so yes.)
- ☐ Does a bad ZIP return an `isError` result instead of crashing?

**Exercise 2 — a state-changing tool.**
Add `remove_from_cart`.
- ☐ Should it have `destructiveHint: true`? Decide and justify.
- ☐ Write a test that *proves* the line was really removed — add, remove, then `get_cart` and assert it's gone. (Check the dish, not the waiter.)

---

## Done — what you should be able to say now

Tick each once you can explain it to the person next to you:

- ☐ What MCP is, using the restaurant analogy — menu, waiter, kitchen, order, dish.
- ☐ Why tool **descriptions and schemas** are things a tester reviews, not just the code.
- ☐ Why `get_reviews` labels its text as untrusted — and what **prompt injection** is.
- ☐ Why you **verify an agent's claims with a read-only tool** after it runs.
- ☐ How to add a tool and prove, with a test, that it does exactly what its menu blurb promises.

---

*Part of a five-repo portfolio — start at [practice-lab](https://github.com/dhanoapartners/practice-lab). Built on [Practice Lab](https://www.dhanoapartners.com). All data synthetic.*
