import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

test('sign_action returns a receipt carrying the mocked signatureId', async () => {
  const signCalls: Array<{ actionType: string; context?: unknown }> = [];
  const createCalls: Array<{ name: string }> = [];
  const initCalls: Array<{ apiKey: string }> = [];

  const fakeReceipt = {
    signatureId: 'sig_test_12345',
    signature: 'base64sig',
    actionId: 'act_1',
    timestamp: '2026-05-29T00:00:00Z',
    verificationUrl: 'https://asqav.com/verify/sig_test_12345',
  };

  // Mock the Asqav SDK before importing the action so the action's
  // module-load bindings resolve to these stubs (no real HTTP).
  mock.module('@asqav/sdk', {
    namedExports: {
      init: (opts: { apiKey: string }) => {
        initCalls.push(opts);
      },
      Agent: {
        create: async (opts: { name: string }) => {
          createCalls.push(opts);
          return {
            sign: async (opts2: { actionType: string; context?: unknown }) => {
              signCalls.push(opts2);
              return fakeReceipt;
            },
          };
        },
      },
    },
  });

  const { signAction } = await import('../dist/src/lib/actions/sign-action.js');

  const result = await signAction.run({
    auth: { type: 'SECRET_TEXT', secret_text: 'sk_test_key' },
    propsValue: {
      actionType: 'api:call',
      context: { model: 'gpt-4' },
    },
  } as never);

  assert.equal((result as typeof fakeReceipt).signatureId, 'sig_test_12345');
  assert.deepEqual(initCalls, [{ apiKey: 'sk_test_key' }]);
  assert.deepEqual(createCalls, [{ name: 'activepieces' }]);
  assert.equal(signCalls.length, 1);
  assert.equal(signCalls[0].actionType, 'api:call');
  assert.deepEqual(signCalls[0].context, { model: 'gpt-4' });
});
