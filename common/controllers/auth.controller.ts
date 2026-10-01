import type { ApiRequest } from '../api/transport';
import type { AuthResponse } from '../models/customer';
export type AuthAction = 'mobileNoValid' | 'checkingMobileno' | 'toSetNewPassword' | 'OTPValidation' | 'memberlogin' | 'add' | 'updatePassword';
export function createAuthController(apiRequest: ApiRequest) {
    async function authRequest(action: AuthAction, body: Record<string, unknown>, signal?: AbortSignal): Promise<AuthResponse> {
        const data = await apiRequest<AuthResponse>(`lambdaAPI/Customer/${action}`, {
            body, signal, authentication: false,
            configurationError: "Login service is not configured. Please contact support.",
            requestError: "Unable to contact the login service. Please try again.",
        });
        if (typeof data?.status !== "boolean")
            throw new Error("Unexpected response from the login service. Please try again.");
        return data;
    }
    return { authRequest };
}
