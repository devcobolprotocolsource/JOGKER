import { onMount, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import type { JSX } from 'solid-js';
import { strings } from '../../shared/strings';
import { refreshShift, shiftState } from '../../shared/stores/shift';
import { refreshSettings, settingsState } from '../../shared/stores/settings';
import { sessionState, touchSessionActivity, signOut } from '../../shared/stores/session';
import { online } from '../../shared/stores/connection';
import { ThemeToggle } from '../../shared/ui/ThemeToggle';

export function AppShell(props: { children: JSX.Element }) {
  const navigate = useNavigate();
  onMount(() => {
    void refreshShift();
    void refreshSettings();
    touchSessionActivity();
  });

  return (
    <div class="app-shell" onPointerDown={touchSessionActivity} onKeyDown={touchSessionActivity}>
      <header class="app-header">
        <a class="app-brand" href="/pos" aria-label={strings.appName}>
          {settingsState.value?.store_name ?? strings.appName}
        </a>
        <div class="app-status">
          <span class="status-pill" data-state={shiftState.active ? 'open' : 'closed'}>
            {shiftState.active ? strings.shell.shiftOpen : strings.shell.shiftClosed}
          </span>
          <span class="status-pill" data-state={online() ? 'online' : 'offline'}>
            <span class="status-dot" aria-hidden="true" />
            {online() ? strings.shell.online : strings.shell.offline}
          </span>
        </div>
        <div class="profile-menu">
          <span>{sessionState.profile?.full_name}</span>
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
      <div class="app-body">
        <nav class="app-nav" aria-label="Navigasi utama">
          <a href="/pos">{strings.shell.pos}</a>
          <a href="/orders">{strings.orders.title}</a>
          <a href="/history">{strings.history.title}</a>
          <a href="/shift">{strings.shell.shift}</a>
          <a href="/menu">{strings.menu.title}</a>
          <a href="/inventory">{strings.inventory.title}</a>
          <a href="/vouchers">{strings.vouchers.title}</a>
          <a href="/payments">{strings.payments.title}</a>
          <a href="/reports">{strings.reports.title}</a>
          <Show when={sessionState.profile?.role === 'super_admin'}>
            <a href="/settings">{strings.settings.title}</a>
            <a href="/audit">{strings.audit.title}</a>
          </Show>
        </nav>
        <main class="app-main">{props.children}</main>
      </div>
    </div>
  );
}
