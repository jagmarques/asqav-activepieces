import { createAction, Property, type InputPropertyMap } from '@activepieces/pieces-framework';
import { asqavAuth } from '../auth';
import { asqavHttpCall, requiredText, stringMap } from '../common';

export const customApiCall = createAction({
  audience: 'human',
  name: 'custom_api_call',
  auth: asqavAuth,
  displayName: 'Custom API Call',
  description: 'Send a JSON request to the Asqav API using this connection.',
  props: {
    url: Property.DynamicProperties({ auth: asqavAuth, displayName: 'URL', required: true, refreshers: [],
      props: async () => ({ url: Property.ShortText({ displayName: 'URL', required: true,
        description: 'An /api/v1-relative path such as /agents, or a full Asqav API URL.' }) }) }),
    method: Property.StaticDropdown({ displayName: 'Method', required: true,
      options: { options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map((value) => ({ label: value, value })) } }),
    headers: Property.Object({ displayName: 'Headers', required: false }),
    queryParams: Property.Object({ displayName: 'Query parameters', required: false }),
    body_type: Property.StaticDropdown({ displayName: 'Body type', required: false, defaultValue: 'none',
      options: { options: [{ label: 'None', value: 'none' }, { label: 'JSON', value: 'json' }] } }),
    body: Property.DynamicProperties({ auth: asqavAuth, displayName: 'Body', required: false, refreshers: ['body_type'],
      props: async ({ body_type }): Promise<InputPropertyMap> => body_type === 'json'
        ? { data: Property.Json({ displayName: 'JSON body', required: true }) } : {} }),
  },
  async run(context) {
    const props = context.propsValue;
    const options = props as Record<string, unknown>;
    if (['response_is_binary', 'failsafe', 'followRedirects'].some((key) => options[key] !== undefined && options[key] !== false)
        || (options['timeout'] !== undefined && options['timeout'] !== 30)) {
      throw new Error('Custom API calls support JSON, a 30-second deadline, errors on failure and no redirects.');
    }
    if (props.body_type !== undefined && !['none', 'json'].includes(props.body_type)) throw new Error('Body type must be none or json.');
    if (props.body_type !== 'json' && props.body !== undefined && (!props.body || Object.keys(props.body).length)) {
      throw new Error('Select JSON body type to send a body.');
    }
    const body = props.body_type === 'json' ? props.body?.['data'] : undefined;
    if (props.body_type === 'json' && body === undefined) throw new Error('JSON body is required.');
    return asqavHttpCall({ apiKey: requiredText(context.auth?.secret_text, 'API key'),
      resourceUri: requiredText(props.url?.['url'], 'URL'), method: requiredText(props.method, 'Method'),
      headers: stringMap(props.headers, 'Headers'), queryParams: stringMap(props.queryParams, 'Query parameters'), body });
  },
});
