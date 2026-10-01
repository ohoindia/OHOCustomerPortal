import type { AuthResponse, Member } from '../../../../common/models/customer';

const sessionKeys = ['accessToken', 'tokenExpiresAt', 'member', 'memberId', 'gender', 'FullName', 'UserImage', 'groupId', 'communityCustomerId'];

export function clearAuthSession(notify = true) {
  for (const key of sessionKeys) sessionStorage.removeItem(key);
  if (notify) window.dispatchEvent(new Event('auth-session-changed'));
}

export function subscribeAuthSession(listener: () => void) {
  window.addEventListener('auth-session-changed', listener);
  return () => window.removeEventListener('auth-session-changed', listener);
}

export function getAccessToken(): string | null {
  const token = sessionStorage.getItem('accessToken');
  const expiresAt = Date.parse(sessionStorage.getItem('tokenExpiresAt') ?? '');
  if (!token || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    // Old profile-only sessions must log in again to obtain a token.
    if (token || sessionStorage.getItem('member')) clearAuthSession(false);
    return null;
  }
  return token;
}

export function saveAuthSession(response: AuthResponse, member: Member) {
  if (!response.JwtToken || !Number.isFinite(Date.parse(response.expiresAt ?? '')) || Date.parse(response.expiresAt!) <= Date.now()) {
    throw new Error('Login did not return a valid session. Please try again.');
  }
  sessionStorage.setItem('accessToken', response.JwtToken);
  sessionStorage.setItem('tokenExpiresAt', response.expiresAt!);
  sessionStorage.setItem('member', JSON.stringify(member));
  for (const [key, value] of Object.entries({
    memberId: member.MemberId, gender: member.Gender, FullName: member.Name,
    UserImage: member.Image, groupId: member.GroupId, communityCustomerId: member.CommunityCustomerId,
  })) sessionStorage.setItem(key, String(value ?? ''));
  window.dispatchEvent(new Event('auth-session-changed'));
}
