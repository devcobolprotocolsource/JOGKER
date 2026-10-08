import { createSignal, onCleanup, onMount, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { KeyRound, Mail } from 'lucide-solid';
import { loginSchema } from '../schemas/login';
import {
  loginLockoutSeconds,
  requestPasswordReset,
  signIn,
} from '../../../shared/stores/session';
import {
  settingsState,
  refreshSettings,
} from '../../../shared/stores/settings';
import { refreshShift, shiftState } from '../../../shared/stores/shift';
import { strings } from '../../../shared/strings';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [error, setError] = createSignal('');
  const [notice, setNotice] = createSignal('');
  const [loading, setLoading] = createSignal(false);
  const [lockedSeconds, setLockedSeconds] = createSignal(loginLockoutSeconds());
  let countdown: number | undefined;

  onMount(() => {
    void refreshSettings();
    countdown = window.setInterval(
      () => setLockedSeconds(loginLockoutSeconds()),
      250,
    );
  });
  onCleanup(() => {
    if (countdown !== undefined) window.clearInterval(countdown);
  });

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    setError('');
    setNotice('');
    const parsed = loginSchema.safeParse({
      email: email(),
      password: password(),
    });
    if (!parsed.success) {
      setError(strings.auth.required);
      return;
    }
    setLoading(true);
    const result = await signIn(parsed.data.email, parsed.data.password);
    setLoading(false);
    if (!result.ok) {
      setError(
        loginLockoutSeconds() > 0
          ? strings.auth.locked.replace(
              '{seconds}',
              String(loginLockoutSeconds()),
            )
          : strings.auth.invalidCredentials,
      );
      setLockedSeconds(loginLockoutSeconds());
      return;
    }
    await refreshShift();
    navigate(shiftState.active ? '/pos' : '/shift', { replace: true });
  }

  async function resetPassword() {
    setError('');
    const parsedEmail = loginSchema.shape.email.safeParse(email());
    if (!parsedEmail.success) {
      setError(strings.auth.required);
      return;
    }
    setNotice(
      (await requestPasswordReset(parsedEmail.data))
        ? strings.auth.resetSent
        : strings.auth.resetFailed,
    );
  }

  return (
    <main class="login-page">
      <section class="login-panel" aria-labelledby="login-title">
        <Show
          when={settingsState.value?.logo_path}
          fallback={
            <div class="login-mark" aria-hidden="true">
              J
            </div>
          }
        >
          <img
            class="login-logo"
            src={settingsState.value?.logo_path ?? ''}
            alt=""
          />
        </Show>
        <p class="login-store-name">
          {settingsState.value?.store_name ?? strings.appName}
        </p>
        <h1 id="login-title">{strings.auth.title}</h1>
        <form class="login-form" onSubmit={submit}>
          <label class="login-field">
            <span>{strings.auth.email}</span>
            <span class="login-input-wrap">
              <Mail size={18} aria-hidden="true" />
              <input
                type="email"
                autocomplete="username"
                required
                value={email()}
                onInput={(event) => setEmail(event.currentTarget.value)}
              />
            </span>
          </label>
          <label class="login-field">
            <span>{strings.auth.password}</span>
            <span class="login-input-wrap">
              <KeyRound size={18} aria-hidden="true" />
              <input
                type="password"
                autocomplete="current-password"
                required
                value={password()}
                onInput={(event) => setPassword(event.currentTarget.value)}
              />
            </span>
          </label>
          <Show when={error()}>
            <p class="form-message form-message--error" role="alert">
              {error()}
            </p>
          </Show>
          <Show when={notice()}>
            <p class="form-message" role="status">
              {notice()}
            </p>
          </Show>
          <button
            class="login-submit"
            type="submit"
            disabled={loading() || lockedSeconds() > 0}
          >
            {lockedSeconds() > 0
              ? strings.auth.locked.replace(
                  '{seconds}',
                  String(lockedSeconds()),
                )
              : strings.auth.submit}
          </button>
          <button class="text-button" type="button" onClick={resetPassword}>
            {strings.auth.forgotPassword}
          </button>
        </form>
      </section>
    </main>
  );
}
