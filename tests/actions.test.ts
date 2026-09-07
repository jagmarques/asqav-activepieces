import { afterAll, afterEach, beforeAll, expect, test, vi } from 'vitest';
import nock from 'nock';
import https from 'node:https';
import { syncBuiltinESMExports } from 'node:module';
import { createMockActionContext, Piece } from '@activepieces/pieces-framework';
import { asqav } from '../packages/pieces/community/asqav/src';

const key = 'sk_fixture_not_a_credential';
const agent = { agent_id: 'agt_fixture', name: 'worker', algorithm: 'ml-dsa-65' };
const receipt = { signature_id: 'sig_fixture', status: 'signed' };
const sign = { agentName: 'worker', actionType: 'email:send', context: { to: 'fixture' } };
const custom = { url: { url: '/agents' }, method: 'GET' };
function api() { return nock('https://api.asqav.com', { reqheaders: { 'x-api-key': key } }); }
function run(name: string, propsValue: Record<string, unknown>, auth: unknown = { type: 'SECRET_TEXT', secret_text: key }) {
  const action = asqav.getAction(name)!;
  const context = { ...createMockActionContext({ propsValue }), auth };
  return action.run(context as Parameters<typeof action.run>[0]);
}
function find(agents: unknown = [agent]) {
  return api().get('/api/v1/agents').query({ name: 'worker', revoked: 'false', limit: '50' }).reply(200, agents);
}
beforeAll(() => nock.disableNetConnect());
afterEach(() => { const pending = nock.pendingMocks(); nock.cleanAll(); vi.restoreAllMocks(); syncBuiltinESMExports(); expect(pending).toEqual([]); });
afterAll(() => nock.enableNetConnect());

test('real framework exports context, auth, actions and dynamic properties', async () => {
  expect(asqav).toBeInstanceOf(Piece);
  expect(asqav.getContextInfo()).toEqual({ version: '2' });
  expect(asqav.minimumSupportedRelease).toBe('0.82.0');
  expect(Object.keys(asqav.actions())).toEqual(['sign_action', 'verify_signature', 'custom_api_call']);
  expect(asqav.auth?.type).toBe('SECRET_TEXT');
  const props = asqav.getAction('custom_api_call')!.props;
  expect(props.method.options.options.map((x: { value: string }) => x.value)).toContain('POST');
  expect(await props.url.props({})).toHaveProperty('url');
  expect(await props.body.props({ body_type: 'json' })).toHaveProperty('data');
  expect(await props.body.props({ body_type: 'none' })).toEqual({});
});
test('auth validation uses the raw secret and an agent-list probe', async () => {
  api().get('/api/v1/agents').query({ limit: '1' }).reply(200, []);
  expect(await asqav.auth!.validate!({ auth: key })).toEqual({ valid: true });
});
test.each([401, 403, 503])('auth probe failure %s is not mislabeled invalid key', async (status) => {
  api().get('/api/v1/agents').query({ limit: '1' }).reply(status, { detail: 'fixture refusal' });
  expect(await asqav.auth!.validate!({ auth: key })).toEqual({ valid: false,
    error: expect.stringContaining('service availability') });
});
test('reuse exact-name agent, send full context and return the server response', async () => {
  find([{ ...agent, name: 'worker-other' }, null, agent]);
  api().post('/api/v1/agents/agt_fixture/sign', { action_type: 'email:send', context: sign.context, session_id: null }).reply(200, receipt);
  expect(await run('sign_action', sign)).toEqual(receipt);
});
test('create agent when first page has no exact match, then sign with compliance requested', async () => {
  find([{ ...agent, name: 'worker-other' }]);
  api().post('/api/v1/agents/create', { name: 'worker', algorithm: 'ml-dsa-65', capabilities: [] }).reply(200, agent);
  api().post('/api/v1/agents/agt_fixture/sign', { action_type: 'email:send', context: {}, session_id: null, compliance_mode: true }).reply(200, receipt);
  expect(await run('sign_action', { ...sign, context: undefined, complianceMode: true })).toEqual(receipt);
});
test('false compliance flag is omitted, identifiers remain one path segment', async () => {
  find([{ ...agent, agent_id: 'agt/a?b' }]);
  api().post('/api/v1/agents/agt%2Fa%3Fb/sign', { action_type: 'email:send', context: {}, session_id: null }).reply(200, receipt);
  expect(await run('sign_action', { ...sign, context: null, complianceMode: false })).toEqual(receipt);
});
test.each([{ agentName: '' }, { actionType: ' ' }, { context: [] }, { context: 'text' }, { complianceMode: 'true' }])('invalid signing input refuses before any request: %j', async (props) => {
  await expect(run('sign_action', { ...sign, ...props })).rejects.toThrow();
});
test.each([null, '', { secret_text: '' }, key])('actions reject invalid context-v2 auth: %j', async (auth) => {
  await expect(run('sign_action', sign, auth)).rejects.toThrow('API key');
});
test('malformed agent list stops signing', async () => {
  find({ agents: [] });
  await expect(run('sign_action', sign)).rejects.toThrow('invalid agent list');
});
test('malformed matched agent identifier stops signing', async () => {
  find([{ name: 'worker' }]);
  await expect(run('sign_action', sign)).rejects.toThrow('Agent identifier');
});
test('verify preserves the hosted verdict, including negative results', async () => {
  api().get('/api/v1/verify/sig%2Fa%3Fb').reply(200, { valid: false, reason: 'fixture mismatch' });
  expect(await run('verify_signature', { signatureId: 'sig/a?b' })).toEqual({ valid: false, reason: 'fixture mismatch' });
});
test.each(['', null, 3])('verify rejects malformed identifier %j without requesting', async (signatureId) => {
  await expect(run('verify_signature', { signatureId })).rejects.toThrow('Signature identifier');
});
test('JSON custom action preserves method, headers, query, body and response metadata', async () => {
  api().matchHeader('x-fixture', 'present').post('/api/v1/example', { nested: [1, null] })
    .query({ q: 'a & b' }).reply(201, { result: 'fixture' }, { 'x-receipt': 'fixture' });
  const response = await run('custom_api_call', { ...custom, url: { url: 'https://api.asqav.com/api/v1/example?q=old' },
    method: 'POST', headers: { 'x-fixture': 'present' }, queryParams: { q: 'a & b' }, body_type: 'json', body: { data: { nested: [1, null] } } });
  expect(response).toMatchObject({ status: 201, headers: { 'x-receipt': 'fixture' }, body: { result: 'fixture' } });
});
test('HTTPS verification is explicitly enabled per request; transport does not change global TLS', async () => {
  const before = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  const spy = vi.spyOn(https, 'request');
  syncBuiltinESMExports();
  api().get('/api/v1/agents').reply(200, []);
  await run('custom_api_call', custom);
  expect(spy.mock.calls[0][1]).toMatchObject({ rejectUnauthorized: true, signal: expect.any(AbortSignal) });
  expect(process.env.NODE_TLS_REJECT_UNAUTHORIZED).toBe(before);
});
test.each(['http://api.asqav.com/api/v1/agents', 'https://foreign.invalid/api/v1/agents', '//foreign.invalid', 'https://api.asqav.com.evil.invalid/api/v1',
  'https://user@api.asqav.com/api/v1/agents', 'https://api.asqav.com/api/v1/agents#fragment', '../outside'])('custom refuses unauthorized URL %s before HTTP', async (url) => {
  await expect(run('custom_api_call', { ...custom, url: { url } })).rejects.toThrow('HTTPS endpoint');
});
test.each([{ headers: { 'X-API-KEY': 'other' } }, { headers: { Host: 'foreign.invalid' } }, { headers: { 'content-length': '0' } },
  { headers: { value: 1 } }, { queryParams: [] }, { method: 'CONNECT' }, { body_type: 'raw' }, { body_type: null },
  { body_type: 'json' }, { body: { data: 'ignored' } }, { followRedirects: true }, { response_is_binary: true }, { failsafe: true }, { timeout: 60 }])('custom rejects unsupported config %j', async (props) => {
  await expect(run('custom_api_call', { ...custom, ...props })).rejects.toThrow();
});
test('custom refuses redirects without following them', async () => {
  api().get('/api/v1/agents').reply(302, { detail: 'moved' }, { Location: 'https://foreign.invalid/' });
  await expect(run('custom_api_call', custom)).rejects.toThrow('302');
});
test.each([
  [401, { detail: 'bad key' }, 'API key (401)'],
  [403, { detail: { reason: 'content_scan_blocked', message: 'fixture scan' } }, 'scanner blocked'],
  [403, { detail: 'scope' }, 'refused the request'],
  [412, { detail: { reason: 'no_policy_evaluated_for_action_type', detail: 'no policy' } }, 'needs an active policy'],
  [412, { detail: { error: 'compliance_mode_strict_unsigned_action' } }, 'requires compliance mode'],
  [412, { detail: null }, 'precondition failed'],
  [422, { detail: [{ loc: ['body', 'context'], msg: 'object required' }, null, {}, { msg: 'bad' }] }, 'body.context: object required'],
  [429, { detail: 'limit' }, 'rate limit'],
  [500, { detail: { unknown: 'fixture' } }, 'API error (500)'],
])('signing refusal %s does not produce a receipt', async (status, body, message) => {
  find();
  api().post('/api/v1/agents/agt_fixture/sign').reply(status as number, body);
  await expect(run('sign_action', sign)).rejects.toThrow(message as string);
});
test('network failure propagates as failure', async () => {
  api().get('/api/v1/verify/sig_fixture').replyWithError('fixture offline');
  await expect(run('verify_signature', { signatureId: 'sig_fixture' })).rejects.toThrow('fixture offline');
});
test('unparseable response is an explicit failure', async () => {
  api().get('/api/v1/agents').reply(200, 'not JSON');
  await expect(run('custom_api_call', custom)).rejects.toThrow('not valid JSON');
});
test('empty JSON endpoint response returns null', async () => {
  api().get('/api/v1/agents').reply(204);
  expect(await run('custom_api_call', custom)).toMatchObject({ status: 204, body: null });
});
