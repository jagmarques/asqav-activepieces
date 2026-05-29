import { PieceAuth } from '@activepieces/pieces-framework';

export const asqavAuth = PieceAuth.SecretText({
  displayName: 'Asqav API Key',
  required: true,
  description:
    'Your Asqav API key. Create one at https://asqav.com. Stored as a secret and sent only to the Asqav API.',
});
