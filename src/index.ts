import { createPiece } from '@activepieces/pieces-framework';
import { asqavAuth } from './lib/auth.js';
import { signAction } from './lib/actions/sign-action.js';

export const asqav = createPiece({
  displayName: 'Asqav',
  logoUrl: 'https://asqav.com/logo.png',
  authors: ['asqav'],
  minimumSupportedRelease: '0.36.1',
  auth: asqavAuth,
  actions: [signAction],
  triggers: [],
});
