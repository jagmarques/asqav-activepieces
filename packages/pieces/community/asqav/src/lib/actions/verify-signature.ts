import { createAction, Property } from '@activepieces/pieces-framework';
import { asqavApiCall, requiredText } from '../common';
import { asqavAuth } from '../auth';

export const verifySignature = createAction({
  name: 'verify_signature',
  auth: asqavAuth,
  displayName: 'Verify Signature',
  description:
    'Request the hosted verification result for an Asqav signature identifier.',
  props: {
    signatureId: Property.ShortText({
      displayName: 'Signature ID',
      description:
        'The signature ID returned by the Sign Action step, for example "sig_...".',
      required: true,
    }),
  },
  async run(context) {
    return asqavApiCall<Record<string, unknown>>({
      apiKey: requiredText(context.auth?.secret_text, 'API key'),
      method: 'GET',
      resourceUri: `/verify/${encodeURIComponent(requiredText(context.propsValue.signatureId, 'Signature identifier'))}`,
    });
  },
});
