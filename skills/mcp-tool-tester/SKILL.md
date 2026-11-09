---
name: mcp-tool-tester
description: Write tests for an MCP server's tools using the MCP TypeScript SDK and node:test, connecting a real client in memory. Use when building or reviewing an MCP server, such as the Practice Lab server in ai-agents-lab.
---

# MCP tool tester

Input: the server's source (or its `listTools` output) and what each tool should do.

## What to test, for every server
1. **The tool list.** Exact tool names; every tool has a real description; only tools that change state lack `readOnlyHint: true`.
2. **Happy path per tool.** Call it the way a model would and check the useful fields, not the whole blob.
3. **Schema rejects bad input.** A malformed argument returns `isError` before any backend call, and the message says what valid input looks like.
4. **Backend errors are results, not crashes.** A 404 or 422 comes back as `isError: true` with a message the model can act on.
5. **Writes are verified independently.** After a write tool, read the state with a different tool (or the API). Never trust the write tool's own reply.
6. **Untrusted text is labelled.** Tools that return user-written content (reviews, emails, documents) mark it as data, not instructions.

## How to connect
```ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
await createServer().connect(serverSide);
const client = new Client({ name: 'test', version: '1.0.0' });
await client.connect(clientSide);
const r = await client.callTool({ name: 'get_product', arguments: { id: 'p-1017' } });
```

## Output
One `*.test.ts` file using `node:test` and `node:assert/strict`, one test per behavior, with a one-line comment saying what each proves.
