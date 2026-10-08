import { onMount } from 'solid-js';
import type { JSX } from 'solid-js';
import { strings } from '../../shared/strings';
import { refreshShift, shiftState } from '../../shared/stores/shift';
import { refreshSettings, settingsState } from '../../shared/stores/settings';
import { sessionState, touchSessionActivity, signOut } from '../../shared/stores/session';
import { online } from '../../shared/stores/connection';
import { ThemeToggle } from '../../shared/ui/ThemeToggle';
import { useNavigate } from '@solidjs/router';

export function PosLayout(props: { children: JSX.Element }) {
  const navigate = useNavigate();
  onMount(() => {
    void refreshShift();
    void refreshSettings();
    touchSessionActivity();
  });

  return (
    <div class="pos-layout" onPointerDown={touchSessionActivity} onKeyDown={touchSessionActivity}>
      <header class="pos-header">
        <div class="pos-header-left">
          <a class="pos-brand" href="/pos" aria-label={strings.appName}>
            {settingsState.value?.store_name ?? strings.appName}
          </a>
        </div>
        <div class="pos-header-center">
          <span class="status-pill" data-state={shiftState.active ? 'open' : 'closed'}>
            {shiftState.active ? strings.shell.shiftOpen : strings.shell.shiftClosed}
          </span>
          <span class="status-pill" data-state={online() ? 'online' : 'offline'}>
            <span class="status-dot" aria-hidden="true" />
            {online() ? strings.shell.online : strings.shell.offline}
          </span>
        </div>
        <div class="pos-header-right">
          <span class="pos-user">{sessionState.profile?.full_name}</span>
          <ThemeToggle />
          <button
            class="signout-button"
            type="button"
            onClick={() => void signOut().then(() => navigate('/login'))}
          >
            {strings.common.signOut}
          </button>
        </div>
      </header>
      <main class="pos-main">{props.children}</main>
    </div>
  );
}
