import { PieceAuth } from '@activepieces/pieces-framework';
import { asqavApiCall } from './common';

export const asqavAuth = PieceAuth.SecretText({
  displayName: 'API Key',
  description: `To get your Asqav API key:
1. Sign in at [asqav.com](https://asqav.com).
2. Open **Dashboard → API Keys**.
3. Create a key and copy it (it starts with \`sk_\`).`,
  required: true,
  validate: async ({ auth }) => {
    try {
      await asqavApiCall({
        apiKey: auth,
        method: 'GET',
        resourceUri: '/agents',
        queryParams: { limit: '1' },
      });
      return { valid: true };
    } catch {
      return {
        valid: false,
        error:
          'Asqav could not validate the connection. Check the API key, its agent-list permission and service availability.',
      };
    }
  },
});
