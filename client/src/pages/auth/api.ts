import { createAuthController } from '../../../../common/controllers/auth.controller';
import { apiRequest } from '../../services/api';

export type { Member, AuthResponse } from '../../../../common/models/customer';
export { remainingSeconds } from '../../../../common/utils/auth';
export const { authRequest } = createAuthController(apiRequest);
