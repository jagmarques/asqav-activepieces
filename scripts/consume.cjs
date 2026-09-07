const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const nock = require('nock');
const { Piece, createMockActionContext } = require('@activepieces/pieces-framework');
const { asqav } = require('@activepieces/piece-asqav');
const key = 'sk_fixture_not_a_credential';
async function run(name, propsValue) {
  return asqav.getAction(name).run({ ...createMockActionContext({ propsValue }), auth: { type: 'SECRET_TEXT', secret_text: key } });
}
async function main() {
  assert(asqav instanceof Piece);
  assert.equal(asqav.getContextInfo().version, '2');
  const entry = require.resolve('@activepieces/piece-asqav');
  assert(!fs.lstatSync(path.dirname(path.dirname(path.dirname(entry)))).isSymbolicLink());
  assert(entry.includes('node_modules/@activepieces/piece-asqav/dist/src/index.js'));
  const base = () => nock('https://api.asqav.com', { reqheaders: { 'x-api-key': key } });
  nock.disableNetConnect();
  base().get('/api/v1/agents').query({ limit: '1' }).reply(200, []);
  assert.deepEqual(await asqav.auth.validate({ auth: key }), { valid: true });
  base().get('/api/v1/agents').query({ name: 'fixture', revoked: 'false', limit: '50' })
    .reply(200, [{ name: 'fixture', agent_id: 'agt_fixture' }]);
  base().post('/api/v1/agents/agt_fixture/sign', { action_type: 'email:send', context: { full: 'fixture' }, session_id: null })
    .reply(200, { signature_id: 'sig_fixture' });
  assert.deepEqual(await run('sign_action', { agentName: 'fixture', actionType: 'email:send', context: { full: 'fixture' } }), { signature_id: 'sig_fixture' });
  base().get('/api/v1/verify/sig_fixture').reply(200, { valid: false });
  assert.deepEqual(await run('verify_signature', { signatureId: 'sig_fixture' }), { valid: false });
  base().post('/api/v1/example', { json: true }).query({ fixture: 'yes' }).reply(201, { accepted: true });
  assert.deepEqual((await run('custom_api_call', { url: { url: '/example' }, method: 'POST', queryParams: { fixture: 'yes' }, body_type: 'json', body: { data: { json: true } } })).body, { accepted: true });
  await assert.rejects(run('custom_api_call', { url: { url: 'https://foreign.invalid/' }, method: 'GET' }), /HTTPS endpoint/);
  assert.deepEqual(nock.pendingMocks(), []);
  console.log(JSON.stringify({ entry, context: asqav.getContextInfo(), framework: require('@activepieces/pieces-framework/package.json').version,
    checks: ['installed entry', 'raw-secret validation', 'context-v2 signing', 'hosted negative verdict', 'JSON custom request', 'foreign-origin refusal'] }));
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => nock.enableNetConnect());
