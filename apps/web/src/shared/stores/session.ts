import { createStore } from 'solid-js/store';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { mapAppError } from '../lib/app-error';
import { getSupabaseClient } from '../api/supabase';
import { strings } from '../strings';

export type Role = 'admin' | 'super_admin';

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  is_active: boolean;
}

interface SessionState {
  loading: boolean;
  userId: string | null;
  email: string | null;
  profile: Profile | null;
  error: string | null;
}

const [sessionState, setSessionState] = createStore<SessionState>({
  loading: true,
  userId: null,
  email: null,
  profile: null,
  error: null,
});

const ATTEMPT_KEY = 'jokger.login-attempts.v1';
const LOCKOUT_DURATION = 30_000;
const MAX_ATTEMPTS = 5;
let authSubscription: { unsubscribe: () => void } | undefined;
let idleTimer: number | undefined;

interface LoginAttempts {
  count: number;
  lockedUntil: number;
}

function readAttempts(): LoginAttempts {
  try {
    const value = localStorage.getItem(ATTEMPT_KEY);
    return value
      ? (JSON.parse(value) as LoginAttempts)
      : { count: 0, lockedUntil: 0 };
  } catch {
    return { count: 0, lockedUntil: 0 };
  }
}

function writeAttempts(value: LoginAttempts): void {
  try {
    localStorage.setItem(ATTEMPT_KEY, JSON.stringify(value));
  } catch {
    return;
  }
}

export function loginLockoutSeconds(now = Date.now()): number {
  return Math.max(0, Math.ceil((readAttempts().lockedUntil - now) / 1000));
}

function recordFailedLogin(): void {
  const attempts = readAttempts();
  const nextCount =
    attempts.lockedUntil > Date.now() ? attempts.count : attempts.count + 1;
  writeAttempts({
    count: nextCount >= MAX_ATTEMPTS ? 0 : nextCount,
    lockedUntil: nextCount >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_DURATION : 0,
  });
}

function clearFailedLogins(): void {
  try {
    localStorage.removeItem(ATTEMPT_KEY);
  } catch {
    return;
  }
}

function clearUser(): void {
  setSessionState({
    loading: false,
    userId: null,
    email: null,
    profile: null,
    error: null,
  });
}

async function loadProfile(authSession: Session | null): Promise<void> {
  if (!authSession?.user) {
    clearUser();
    return;
  }
  setSessionState({
    loading: true,
    userId: authSession.user.id,
    email: authSession.user.email ?? null,
    profile: null,
    error: null,
  });
  try {
    const { data, error } = await getSupabaseClient()
      .from('profiles')
      .select('id, full_name, role, is_active')
      .eq('id', authSession.user.id)
      .single();
    if (error || !data || !data.is_active) {
      await getSupabaseClient().auth.signOut();
      setSessionState({
        loading: false,
        userId: null,
        email: null,
        profile: null,
        error: strings.errors.NOT_AUTHORIZED,
      });
      return;
    }
    setSessionState({
      loading: false,
      userId: authSession.user.id,
      email: authSession.user.email ?? null,
      profile: data as Profile,
      error: null,
    });
  } catch {
    setSessionState({
      loading: false,
      userId: null,
      email: null,
      profile: null,
      error: strings.errors.NETWORK_ERROR,
    });
  }
}

export async function initializeSession(): Promise<void> {
  try {
    const client = getSupabaseClient();
    const { data } = await client.auth.getSession();
    await loadProfile(data.session);
    if (!authSubscription) {
      const { data: listener } = client.auth.onAuthStateChange(
        (_event: AuthChangeEvent, authSession) => {
          queueMicrotask(() => void loadProfile(authSession));
        },
      );
      authSubscription = listener.subscription;
    }
  } catch (error) {
    setSessionState({
      loading: false,
      userId: null,
      email: null,
      profile: null,
      error: mapAppError(error).message,
    });
  }
}

export async function signIn(
  email: string,
  password: string,
): Promise<{ ok: boolean; message?: string }> {
  if (loginLockoutSeconds() > 0)
    return { ok: false, message: strings.errors.REQUEST_TIMEOUT };
  try {
    const { data, error } = await getSupabaseClient().auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.session) {
      recordFailedLogin();
      return { ok: false, message: strings.errors.UNKNOWN };
    }
    clearFailedLogins();
    await loadProfile(data.session);
    return sessionState.profile
      ? { ok: true }
      : { ok: false, message: sessionState.error ?? strings.errors.UNKNOWN };
  } catch {
    return { ok: false, message: strings.errors.NETWORK_ERROR };
  }
}

export async function requestPasswordReset(email: string): Promise<boolean> {
  try {
    const { error } =
      await getSupabaseClient().auth.resetPasswordForEmail(email);
    return !error;
  } catch {
    return false;
  }
}

export async function signOut(): Promise<void> {
  try {
    await getSupabaseClient().auth.signOut();
  } finally {
    clearUser();
  }
}

export function touchSessionActivity(): void {
  if (idleTimer !== undefined) window.clearTimeout(idleTimer);
  if (!sessionState.userId) return;
  idleTimer = window.setTimeout(() => void signOut(), 8 * 60 * 60 * 1000);
}

export function disposeSession(): void {
  authSubscription?.unsubscribe();
  authSubscription = undefined;
  if (idleTimer !== undefined) window.clearTimeout(idleTimer);
}

export { sessionState };
