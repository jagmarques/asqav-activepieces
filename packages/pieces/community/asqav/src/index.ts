import { createPiece } from '@activepieces/pieces-framework';
import { PieceCategory } from '@activepieces/shared';
import { asqavAuth } from './lib/auth';
import { signAction } from './lib/actions/sign-action';
import { verifySignature } from './lib/actions/verify-signature';
import { customApiCall } from './lib/actions/custom-api-call';

export const asqav = createPiece({
  displayName: 'Asqav',
  description:
    'Request Asqav signing and hosted verification for configured action data.',
  auth: asqavAuth,
  logoUrl: 'https://cdn.activepieces.com/pieces/asqav.png',
  categories: [PieceCategory.ARTIFICIAL_INTELLIGENCE],
  authors: ['jagmarques'],
  actions: [
    signAction,
    verifySignature,
    customApiCall,
  ],
  triggers: [],
});
