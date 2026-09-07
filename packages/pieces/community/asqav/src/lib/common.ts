import { request } from 'node:https';
import type { IncomingHttpHeaders } from 'node:http';

export const ASQAV_BASE_URL = 'https://api.asqav.com/api/v1';

export interface AsqavApiCallParams {
  apiKey: string;
  method: string;
  resourceUri: string;
  queryParams?: Record<string, string>;
  headers?: Record<string, string>;
  body?: unknown;
}

export function requiredText(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a nonempty string.`);
  return value;
}

export function stringMap(value: unknown, label: string): Record<string, string> {
  if (value === undefined) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || Object.values(value).some((entry) => typeof entry !== 'string')) {
    throw new Error(`${label} must be an object with string values.`);
  }
  return value as Record<string, string>;
}

export function asqavUrl(path: string): URL {
  requiredText(path, 'URL');
  const url = new URL(path.startsWith('/') ? path.slice(1) : path, `${ASQAV_BASE_URL}/`);
  if (url.origin !== 'https://api.asqav.com' || url.username || url.password || url.hash
      || !(url.pathname === '/api/v1' || url.pathname.startsWith('/api/v1/'))) {
    throw new Error('URL must be an HTTPS endpoint under https://api.asqav.com/api/v1.');
  }
  return url;
}

export async function asqavHttpCall(params: AsqavApiCallParams) {
  const url = asqavUrl(params.resourceUri);
  const headers = stringMap(params.headers, 'Headers');
  if (Object.keys(headers).some((key) => ['x-api-key', 'host', 'content-length'].includes(key.toLowerCase()))) {
    throw new Error('The connection controls X-API-Key, Host and Content-Length headers.');
  }
  for (const [key, value] of Object.entries(stringMap(params.queryParams, 'Query parameters'))) url.searchParams.set(key, value);
  const apiKey = requiredText(params.apiKey, 'API key');
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(params.method)) throw new Error('Unsupported HTTP method.');
  let body: string | undefined;
  try { body = params.body === undefined ? undefined : JSON.stringify(params.body); }
  catch { throw new Error('Body must be JSON-serializable.'); }
  if (params.body !== undefined && body === undefined) throw new Error('Body must be JSON-serializable.');
  const response = await new Promise<{ status: number; headers: IncomingHttpHeaders; body: unknown }>((resolve, reject) => {
    const req = request(url, { method: params.method, rejectUnauthorized: true,
      signal: AbortSignal.timeout(30_000), headers: { ...headers, 'Content-Type': 'application/json', 'X-API-Key': apiKey } }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('error', reject);
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        try { resolve({ status: res.statusCode ?? 0, headers: res.headers, body: text ? JSON.parse(text) : null }); }
        catch { reject(new Error('Asqav returned a response that is not valid JSON.')); }
      });
    });
    req.on('error', reject);
    req.end(body);
  });
  if (response.status < 200 || response.status >= 300) throw mapAsqavError(response.status, response.body);
  return response;
}

export async function asqavApiCall<T>(params: AsqavApiCallParams): Promise<T> {
  return (await asqavHttpCall(params)).body as T;
}

function extractDetail(body: unknown): { reason?: string; text: string } {
  if (typeof body === 'object' && body !== null && 'detail' in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === 'string') {
      return { text: detail };
    }
    if (Array.isArray(detail)) {
      // FastAPI validation errors: [{ loc, msg, type, input }, ...]
      const text = detail
        .map((item: unknown) => {
          if (!item || typeof item !== 'object') return JSON.stringify(item);
          const entry = item as { loc?: unknown[]; msg?: string };
          const field = Array.isArray(entry.loc) ? entry.loc.join('.') : '';
          return field ? `${field}: ${entry.msg ?? ''}` : entry.msg ?? JSON.stringify(item);
        })
        .join('; ');
      return { text };
    }
    if (typeof detail === 'object' && detail !== null) {
      const obj = detail as { reason?: string; error?: string; detail?: string; message?: string };
      return {
        reason: obj.reason ?? obj.error,
        text: obj.detail ?? obj.message ?? JSON.stringify(detail),
      };
    }
    return { text: JSON.stringify(detail) };
  }
  return { text: typeof body === 'string' ? body : JSON.stringify(body) };
}

function mapAsqavError(status: number, body: unknown): Error {
  const { reason, text } = extractDetail(body);

  switch (status) {
    case 401:
      return new Error(
        'Asqav rejected the API key (401). Reconnect with a valid key from your Asqav dashboard at https://asqav.com.'
      );
    case 403:
      if (reason === 'content_scan_blocked') {
        return new Error(
          `Asqav's content scanner blocked signing (403): ${text} Remove sensitive data such as PII from the Context and retry.`
        );
      }
      return new Error(
        `Asqav refused the request (403): ${text} The key may lack the required scope, or the agent may be suspended or owned by another organization.`
      );
    case 412:
      if (reason === 'no_policy_evaluated_for_action_type') {
        return new Error(
          `Asqav precondition failed (412): ${text} Compliance mode needs an active policy matching this action type. Create one in your Asqav dashboard, or turn off Compliance Mode on this step.`
        );
      }
      if (reason === 'compliance_mode_strict_unsigned_action') {
        return new Error(
          `Asqav precondition failed (412): ${text} Your organization requires compliance mode, so enable Compliance Mode on this step.`
        );
      }
      return new Error(`Asqav precondition failed (412): ${text}`);
    case 422:
      return new Error(
        `Asqav rejected the request payload (422): ${text}. Check the step inputs, for example Context must be a JSON object.`
      );
    case 429:
      return new Error(
        `Asqav rate limit reached (429): ${text} Wait and retry, or raise the plan limit in your Asqav dashboard.`
      );
    default:
      return new Error(`Asqav API error (${status}): ${text}`);
  }
}

interface AsqavAgent {
  agent_id: string;
  name: string;
  algorithm: string;
}

export async function getOrCreateAgent(
  apiKey: string,
  name: string
): Promise<AsqavAgent> {
  const existing = await asqavApiCall<AsqavAgent[]>({
    apiKey,
    method: 'GET',
    resourceUri: '/agents',
    queryParams: { name, revoked: 'false', limit: '50' },
  });
  if (!Array.isArray(existing)) throw new Error('Asqav returned an invalid agent list.');
  const match = existing.find((agent) => agent && agent.name === name);
  if (match) {
    return match;
  }
  return asqavApiCall<AsqavAgent>({
    apiKey,
    method: 'POST',
    resourceUri: '/agents/create',
    body: {
      name,
      algorithm: 'ml-dsa-65',
      capabilities: [],
    },
  });
}
