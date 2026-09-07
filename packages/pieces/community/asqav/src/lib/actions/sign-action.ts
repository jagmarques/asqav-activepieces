import { createAction, Property } from '@activepieces/pieces-framework';
import { asqavApiCall, getOrCreateAgent, requiredText } from '../common';
import { asqavAuth } from '../auth';

export const signAction = createAction({
  name: 'sign_action',
  auth: asqavAuth,
  displayName: 'Sign Action',
  description:
    'Submit configured action data for Asqav signing and return the API response.',
  props: {
    agentName: Property.ShortText({
      displayName: 'Agent Name',
      description:
        'Reuse an exact-name match in the first 50 non-revoked search results, or create an agent.',
      required: true,
      defaultValue: 'activepieces',
    }),
    actionType: Property.ShortText({
      displayName: 'Action Type',
      description:
        'Namespaced identifier for the action being signed, in namespace:verb format, for example "payments:charge" or "email:send".',
      required: true,
    }),
    context: Property.Json({
      displayName: 'Context',
      description:
        'Optional JSON object sent in full to the Asqav API.',
      required: false,
    }),
    complianceMode: Property.Checkbox({
      displayName: 'Compliance Mode',
      description:
        'Request a policy-evaluated compliance receipt. Needs an active policy matching the action type in your Asqav organization.',
      required: false,
      defaultValue: false,
    }),
  },
  async run(context) {
    const apiKey = requiredText(context.auth?.secret_text, 'API key');
    const { agentName, actionType, complianceMode } = context.propsValue;
    requiredText(agentName, 'Agent name');
    requiredText(actionType, 'Action type');
    const value = context.propsValue.context ?? {};
    if (typeof value !== 'object' || Array.isArray(value)) throw new Error('Context must be a JSON object.');
    if (complianceMode !== undefined && typeof complianceMode !== 'boolean') throw new Error('Compliance Mode must be a boolean.');
    const agent = await getOrCreateAgent(apiKey, agentName);

    const body: Record<string, unknown> = {
      action_type: actionType,
      context: value,
      session_id: null,
    };
    if (complianceMode) {
      body['compliance_mode'] = true;
    }

    return asqavApiCall<Record<string, unknown>>({
      apiKey,
      method: 'POST',
      resourceUri: `/agents/${encodeURIComponent(requiredText(agent.agent_id, 'Agent identifier'))}/sign`,
      body,
    });
  },
});
