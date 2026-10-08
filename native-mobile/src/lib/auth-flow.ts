export type Flow = {
  guid: string;
  reset: boolean;
  verified: boolean;
  deadline: number;
  resends: number;
};
let pending: { flow: Flow; phone: string; name: string } | null = null;
export const getAuthFlow = () => pending;
export const setAuthFlow = (value: typeof pending) => {
  pending = value;
};
