/**
 * A custom reporter for Node's test runner that writes one self-contained HTML page for the MCP tests:
 * a summary, which tools were exercised, and for every test each MCP call with its arguments and the
 * server's response. Tests log calls with `t.diagnostic('MCP {json}')` (see tests/server.test.ts).
 *
 * Used by `npm run test:report`:
 *   node --test --test-reporter=spec --test-reporter-destination=stdout
 *               --test-reporter=./reporters/mcp-html.mjs --test-reporter-destination=reports/mcp-report.html
 */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pretty = (text) => { try { return JSON.stringify(JSON.parse(text), null, 2); } catch { return text; } };

export default async function* mcpHtmlReporter(source) {
  const tests = [];
  // Node reports a test's diagnostics around its pass/fail event, so calls are matched by test name, not order.
  const callsByTest = new Map();
  const started = new Date();

  for await (const event of source) {
    const d = event.data ?? {};
    if (event.type === 'test:diagnostic' && typeof d.message === 'string' && d.message.startsWith('MCP ')) {
      try {
        const { test, ...call } = JSON.parse(d.message.slice(4));
        if (!callsByTest.has(test)) callsByTest.set(test, []);
        callsByTest.get(test).push(call);
      } catch { /* not ours */ }
    } else if ((event.type === 'test:pass' || event.type === 'test:fail') && d.details?.type !== 'suite') {
      const err = d.details?.error;
      tests.push({
        name: d.name,
        ok: event.type === 'test:pass',
        skipped: Boolean(d.skip || d.todo),
        ms: Math.round(d.details?.duration_ms ?? 0),
        error: err ? String(err.cause?.message ?? err.message ?? err) : '',
        calls: [],
      });
    }
  }

  for (const t of tests) t.calls = callsByTest.get(t.name) ?? [];
  const passed = tests.filter((t) => t.ok).length;
  const failed = tests.length - passed;
  const totalMs = tests.reduce((a, t) => a + t.ms, 0);
  const tools = new Map();
  for (const t of tests) for (const c of t.calls) {
    const x = tools.get(c.tool) ?? { calls: 0, errors: 0, tests: new Set() };
    x.calls++; if (c.isError) x.errors++; x.tests.add(t.name);
    tools.set(c.tool, x);
  }

  const callHtml = (c) => `
    <details class="call${c.isError ? ' iserr' : ''}">
      <summary><code>${esc(c.tool)}</code> ${c.isError ? '<span class="pill err">isError</span>' : '<span class="pill ok">ok</span>'}
        <span class="muted">${esc(JSON.stringify(c.args))}</span><span class="ms">${c.ms} ms</span></summary>
      <div class="io"><div><h4>Arguments</h4><pre>${esc(JSON.stringify(c.args, null, 2))}</pre></div>
      <div><h4>Response</h4><pre>${esc(pretty(c.response))}</pre></div></div>
    </details>`;

  const testHtml = (t, i) => `
    <section class="test ${t.ok ? 'pass' : 'fail'}" id="t${i}">
      <details ${t.ok ? '' : 'open'}>
        <summary><span class="dot"></span><span class="name">${esc(t.name)}</span>
          <span class="muted">${t.calls.length} MCP call${t.calls.length === 1 ? '' : 's'}</span><span class="ms">${t.ms} ms</span></summary>
        ${t.error ? `<pre class="error">${esc(t.error)}</pre>` : ''}
        ${t.calls.map(callHtml).join('') || '<p class="muted">No MCP calls recorded.</p>'}
      </details>
    </section>`;

  yield `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>MCP server test report</title>
<style>
  :root{--bg:#f6f7f9;--card:#fff;--ink:#1d2330;--muted:#6b7280;--line:#e5e7eb;--ok:#15803d;--okbg:#e8f5ec;--err:#b91c1c;--errbg:#fdecec;--accent:#3b4cca}
  *{box-sizing:border-box}body{margin:0;font:14px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;background:var(--bg);color:var(--ink)}
  header{background:#1d2330;color:#fff;padding:22px 32px}header h1{margin:0;font-size:20px}header p{margin:4px 0 0;color:#c7cbd6}
  main{max-width:1100px;margin:0 auto;padding:24px 32px}
  .cards{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}
  .card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 16px}
  .card b{display:block;font-size:24px}.card span{color:var(--muted)}
  .card.ok b{color:var(--ok)}.card.bad b{color:${failed ? 'var(--err)' : 'var(--muted)'}}
  .bar{height:8px;border-radius:4px;background:var(--errbg);overflow:hidden;margin:-6px 0 22px}.bar i{display:block;height:100%;background:var(--ok);width:${tests.length ? (passed / tests.length) * 100 : 0}%}
  h2{font-size:15px;margin:24px 0 10px}
  table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);border-radius:10px;overflow:hidden}
  th,td{text-align:left;padding:8px 12px;border-bottom:1px solid var(--line)}th{background:#fafbfc;color:var(--muted);font-weight:600}.n{text-align:right}
  .test{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--ok);border-radius:8px;margin-bottom:8px}
  .test.fail{border-left-color:var(--err)}
  .test>details>summary{padding:10px 14px;cursor:pointer;display:flex;gap:10px;align-items:center;list-style:none}
  .test>details>summary::-webkit-details-marker{display:none}
  .dot{width:9px;height:9px;border-radius:50%;background:var(--ok);flex:none}.fail .dot{background:var(--err)}
  .name{font-weight:600;flex:1}.muted{color:var(--muted)}.ms{color:var(--muted);font-variant-numeric:tabular-nums;min-width:60px;text-align:right}
  .call{margin:0 14px 8px;border:1px solid var(--line);border-radius:6px}.call.iserr{border-color:#f3c4c4}
  .call>summary{padding:7px 10px;cursor:pointer;display:flex;gap:10px;align-items:center}
  .call>summary .muted{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:ui-monospace,Menlo,monospace;font-size:12px}
  .pill{font-size:11px;padding:1px 7px;border-radius:9px}.pill.ok{background:var(--okbg);color:var(--ok)}.pill.err{background:var(--errbg);color:var(--err)}
  .io{display:grid;grid-template-columns:1fr 2fr;gap:10px;padding:0 10px 10px}.io h4{margin:6px 0;font-size:12px;color:var(--muted)}
  pre{margin:0;background:#f8f9fb;border:1px solid var(--line);border-radius:6px;padding:8px;font:12px/1.45 ui-monospace,Menlo,monospace;white-space:pre-wrap;word-break:break-word;max-height:360px;overflow:auto}
  pre.error{margin:0 14px 10px;background:var(--errbg);border-color:#f3c4c4;color:var(--err)}
  code{font-family:ui-monospace,Menlo,monospace;font-weight:600}
  .toolbar{display:flex;gap:8px;margin:0 0 10px}.toolbar button{border:1px solid var(--line);background:var(--card);border-radius:6px;padding:4px 10px;cursor:pointer}
  footer{color:var(--muted);font-size:12px;text-align:center;padding:20px}
</style></head>
<body>
<header><h1>MCP server test report</h1>
<p>Practice Lab MCP server · tested through a real MCP client · ${esc(started.toISOString().replace('T', ' ').slice(0, 19))} UTC · target ${esc(process.env.LAB_URL || 'https://www.dhanoapartners.com')}</p></header>
<main>
  <div class="cards">
    <div class="card"><b>${tests.length}</b><span>tests</span></div>
    <div class="card ok"><b>${passed}</b><span>passed</span></div>
    <div class="card bad"><b>${failed}</b><span>failed</span></div>
    <div class="card"><b>${(totalMs / 1000).toFixed(1)} s</b><span>${tests.reduce((a, t) => a + t.calls.length, 0)} MCP calls</span></div>
  </div>
  <div class="bar"><i></i></div>

  <h2>Tools exercised</h2>
  <table><thead><tr><th>Tool</th><th class="n">Calls</th><th class="n">isError results</th><th class="n">Tests</th></tr></thead><tbody>
  ${[...tools.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([name, x]) =>
    `<tr><td><code>${esc(name)}</code></td><td class="n">${x.calls}</td><td class="n">${x.errors}</td><td class="n">${x.tests.size}</td></tr>`).join('')}
  </tbody></table>

  <h2>Tests</h2>
  <div class="toolbar"><button onclick="document.querySelectorAll('details').forEach(d=>d.open=true)">Expand all</button>
  <button onclick="document.querySelectorAll('details').forEach(d=>d.open=false)">Collapse all</button>
  <button onclick="document.querySelectorAll('.test.pass').forEach(t=>t.hidden=!t.hidden)">Show/hide passed</button></div>
  ${tests.map(testHtml).join('')}
</main>
<footer>Generated by reporters/mcp-html.mjs · ai-agents-lab</footer>
</body></html>
`;
}
