/**
 * @file A tiny client for the Practice Lab REST API, used by the MCP server's tools.
 *
 * Every server instance gets its own session id, so carts never mix between users or tests.
 * Set `LAB_URL` to use a local copy of the site (default: the live lab).
 */
import { randomUUID } from 'node:crypto';

export const LAB_URL = (process.env.LAB_URL || 'https://www.dhanoapartners.com').replace(/\/$/, '');

/** An error from the lab API, with its HTTP status and the API's own message. */
export class LabError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

export class LabClient {
  /** One session per client: its own cart, isolated from everyone else's. */
  readonly sessionId = 'mcp' + randomUUID().replace(/-/g, '');

  constructor(private readonly baseUrl = LAB_URL) {}

  /** Calls the API and returns the JSON body, or throws a LabError with the API's message. */
  async call<T = unknown>(method: 'GET' | 'POST', path: string, body?: object): Promise<T> {
    const res = await fetch(`${this.baseUrl}/api/v1${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Session-Id': this.sessionId },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    const json = text ? JSON.parse(text) : {};
    if (!res.ok) throw new LabError(res.status, json.error || `${method} ${path} returned ${res.status}`);
    return json as T;
  }
}
