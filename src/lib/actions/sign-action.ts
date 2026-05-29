import { createAction, Property } from '@activepieces/pieces-framework';
import { init, Agent } from '@asqav/sdk';
import { asqavAuth } from '../auth.js';

export const signAction = createAction({
  name: 'sign_action',
  auth: asqavAuth,
  displayName: 'Sign Action',
  description:
    'Signs an action with an Asqav agent and returns the signed receipt, including the signature id and verification URL.',
  props: {
    actionType: Property.ShortText({
      displayName: 'Action Type',
      required: true,
      description:
        'Namespaced action identifier to sign, for example "api:call" or "email:send".',
    }),
    context: Property.Json({
      displayName: 'Context',
      required: false,
      description:
        'Optional JSON object of non-sensitive metadata to bind into the receipt.',
    }),
  },
  async run(context) {
    init({ apiKey: context.auth.secret_text });
    const agent = await Agent.create({ name: 'activepieces' });
    const receipt = await agent.sign({
      actionType: context.propsValue.actionType,
      context: context.propsValue.context as
        | Record<string, unknown>
        | undefined,
    });
    return receipt;
  },
});
