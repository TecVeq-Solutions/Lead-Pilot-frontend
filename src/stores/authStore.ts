import { create } from 'zustand';
import type { User, Organization } from '../types';

interface AuthState {
  token: string | null;
  user: User | null;
  organization: Organization | null;
  setAuth: (token: string, user: User, organization: Organization) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('wazzy_token'),
  user: JSON.parse(localStorage.getItem('wazzy_user') || 'null'),
  organization: JSON.parse(localStorage.getItem('wazzy_org') || 'null'),
  setAuth: (token, user, organization) => {
    localStorage.setItem('wazzy_token', token);
    localStorage.setItem('wazzy_user', JSON.stringify(user));
    localStorage.setItem('wazzy_org', JSON.stringify(organization));
    set({ token, user, organization });
  },
  clearAuth: () => {
    localStorage.removeItem('wazzy_token');
    localStorage.removeItem('wazzy_user');
    localStorage.removeItem('wazzy_org');
    set({ token: null, user: null, organization: null });
  },
}));
