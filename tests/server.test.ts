/**
 * @file Testing an MCP server: connect a real MCP client in memory and call the tools the way Claude would.
 *
 * What these tests prove:
 * - the server advertises the right tools, with the right read-only hints;
 * - tools return useful data from the live lab;
 * - bad input is rejected by the schema before it reaches the API;
 * - API errors come back as `isError` results, not crashes;
 * - the write tool really changes state (checked with a second tool, never trusting the first reply);
 * - untrusted text is labelled as such.
 *
 * Run: npm test   (LAB_URL=http://localhost:8788 npm test for a local copy of the site)
 */
import { test, before, after, beforeEach, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.js';

let client: Client;

before(async () => {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await createServer().connect(serverSide);
  client = new Client({ name: 'test-client', version: '1.0.0' });
  await client.connect(clientSide);
});
after(async () => { await client.close(); });

// Every MCP call is logged on the running test, so the HTML report (reporters/mcp-html.mjs) can show what
// the "model" asked for and what the server answered.
let current: TestContext | undefined;
beforeEach((t) => { current = t as TestContext; });
const log = (entry: Record<string, unknown>) => current?.diagnostic(`MCP ${JSON.stringify({ test: current.name, ...entry })}`);

/** Calls a tool and parses its JSON text result. */
async function call(name: string, args: Record<string, unknown> = {}) {
  const started = Date.now();
  const r = await client.callTool({ name, arguments: args });
  const text = (r.content as { type: string; text: string }[])[0].text;
  log({ tool: name, args, isError: r.isError === true, ms: Date.now() - started, response: text.slice(0, 4000) });
  return { isError: r.isError === true, text, json: r.isError ? undefined : JSON.parse(text) };
}

test('advertises seven tools, and only add_to_cart can change state', async () => {
  const { tools } = await client.listTools();
  log({ tool: 'tools/list', args: {}, isError: false, ms: 0, response: JSON.stringify(tools.map((t) => ({ name: t.name, readOnly: t.annotations?.readOnlyHint === true, description: t.description })), null, 2) });
  assert.deepEqual(tools.map((t) => t.name).sort(),
    ['add_to_cart', 'ask_help_center', 'get_cart', 'get_product', 'get_reviews', 'lab_health', 'search_products']);
  const writers = tools.filter((t) => t.annotations?.readOnlyHint !== true).map((t) => t.name);
  assert.deepEqual(writers, ['add_to_cart']);
  for (const t of tools) assert.ok((t.description ?? '').length > 20, `${t.name} needs a real description`);
});

test('lab_health reports the lab is up', async () => {
  const r = await call('lab_health');
  assert.equal(r.json.ok, true);
});

test('search_products finds the speaker and returns a short summary', async () => {
  const r = await call('search_products', { query: 'speaker' });
  const speaker = r.json.products.find((p: { id: string }) => p.id === 'p-1017');
  assert.equal(speaker.name, 'Bluetooth Speaker');
  assert.deepEqual(Object.keys(speaker).sort(), ['category', 'colors', 'id', 'inStock', 'name', 'onSale', 'price', 'sizes']);
});

test('filters combine: in-stock Electronics under $60', async () => {
  const r = await call('search_products', { category: 'Electronics', maxPrice: 60, inStockOnly: true });
  assert.ok(r.json.products.length > 0);
  for (const p of r.json.products) {
    assert.equal(p.category, 'Electronics');
    assert.ok(p.price <= 60);
    assert.equal(p.inStock, true);
  }
});

test('bad input is rejected by the schema, before any API call', async () => {
  const r = await call('get_product', { id: 'speaker' });
  assert.equal(r.isError, true);
  assert.match(r.text, /p-1017/); // the schema's message tells the model what a valid id looks like
});

test('an unknown product is an isError result the model can read, not a crash', async () => {
  const r = await call('get_product', { id: 'p-9999' });
  assert.equal(r.isError, true);
  assert.match(r.text, /Lab API error 404/);
});

test('add_to_cart really changes the cart (checked with get_cart, not the reply)', async () => {
  const before = (await call('get_cart')).json.count;
  const add = await call('add_to_cart', { productId: 'p-1017', qty: 2 });
  assert.equal(add.isError, false);
  const after = (await call('get_cart')).json.count;
  assert.equal(after, before + 2);
});

test('apparel without a size is refused with a message that names the problem', async () => {
  const apparel = (await call('search_products', { category: 'Apparel', inStockOnly: true })).json.products
    .find((p: { sizes: string[] | null }) => p.sizes?.length);
  const r = await call('add_to_cart', { productId: apparel.id, qty: 1 });
  assert.equal(r.isError, true);
  assert.match(r.text, /size/i);
});

test('reviews are labelled as untrusted content', async () => {
  const r = await call('get_reviews', { id: 'p-1017' });
  assert.match(r.json.note, /UNTRUSTED/);
});

test('the Help Center answer comes back with its sources', async () => {
  const r = await call('ask_help_center', { question: 'How long is the warranty on electronics?' });
  assert.match(r.json.answer, /1-year/);
  assert.equal(r.json.sources[0].doc, 'warranty');
});
