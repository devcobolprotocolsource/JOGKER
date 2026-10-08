import { Route, Router, useNavigate } from '@solidjs/router';
import { createEffect, lazy, onCleanup, onMount } from 'solid-js';
import { strings } from '../shared/strings';
import {
  initializeSession,
  sessionState,
  touchSessionActivity,
} from '../shared/stores/session';
import { initializeConnection, online } from '../shared/stores/connection';
import { refreshShift, shiftState } from '../shared/stores/shift';
import { refreshSettings, settingsState } from '../shared/stores/settings';
import { ProtectedPage } from './guards/ProtectedPages';
import { ForbiddenPage } from '../features/auth';

const LoginPage = lazy(() =>
  import('../features/auth/components/LoginPage').then((module) => ({
    default: module.LoginPage,
  })),
);
const PosPage = lazy(() =>
  import('../features/pos/components/PosPage').then((module) => ({
    default: module.PosPage,
  })),
);

export function App() {
  let disposeConnection: (() => void) | undefined;
  onMount(() => {
    disposeConnection = initializeConnection();
    void initializeSession();
  });
  onCleanup(() => disposeConnection?.());

  return (
    <Router>
      <Route path="/" component={RootRedirect} />
      <Route path="/login" component={LoginPage} />
      <Route path="/403" component={ForbiddenRoute} />
      <Route
        path="/pos"
        component={() => (
          <ProtectedPage>
            <ApplicationShell>
              <PosPage />
            </ApplicationShell>
          </ProtectedPage>
        )}
      />
      <Route
        path="/shift"
        component={() => (
          <ProtectedPage>
            <ApplicationShell>
              <ShiftEntryPage />
            </ApplicationShell>
          </ProtectedPage>
        )}
      />
      <Route
        path="/*rest"
        component={() => (
          <ProtectedPage>
            <ApplicationShell>
              <NotFoundPage />
            </ApplicationShell>
          </ProtectedPage>
        )}
      />
    </Router>
  );
}

function RootRedirect() {
  const navigate = useNavigate();
  createEffect(() => {
    if (!sessionState.loading) {
      if (!sessionState.userId) {
        navigate('/login', { replace: true });
      } else {
        void refreshShift().then(() =>
          navigate(shiftState.active ? '/pos' : '/shift', { replace: true }),
        );
      }
    }
  });
  return (
    <p class="route-loading" role="status">
      {strings.common.loading}
    </p>
  );
}

function ForbiddenRoute() {
  return (
    <ProtectedPage>
      <ForbiddenPage />
    </ProtectedPage>
  );
}

function ApplicationShell(props: { children: import('solid-js').JSX.Element }) {
  const navigate = useNavigate();
  onMount(() => {
    void refreshShift();
    void refreshSettings();
    touchSessionActivity();
  });
  return (
    <div
      class="app-shell"
      onPointerDown={touchSessionActivity}
      onKeyDown={touchSessionActivity}
    >
      <header class="app-header">
        <a class="app-brand" href="/pos" aria-label={strings.appName}>
          {settingsState.value?.store_name ?? strings.appName}
        </a>
        <div class="app-status">
          <span
            class="status-pill"
            data-state={shiftState.active ? 'open' : 'closed'}
          >
            {shiftState.active
              ? strings.shell.shiftOpen
              : strings.shell.shiftClosed}
          </span>
          <span
            class="status-pill"
            data-state={online() ? 'online' : 'offline'}
          >
            <span class="status-dot" aria-hidden="true" />
            {online() ? strings.shell.online : strings.shell.offline}
          </span>
        </div>
        <div class="profile-menu">
          <span>{sessionState.profile?.full_name}</span>
          <button
            class="signout-button"
            type="button"
            onClick={() =>
              void import('../shared/stores/session')
                .then(({ signOut }) => signOut())
                .then(() => navigate('/login'))
            }
          >
            {strings.common.signOut}
          </button>
        </div>
      </header>
      <div class="app-body">
        <nav class="app-nav" aria-label="Navigasi utama">
          <a href="/pos">{strings.shell.pos}</a>
          <a href="/shift">{strings.shell.shift}</a>
        </nav>
        {props.children}
      </div>
    </div>
  );
}

function ShiftEntryPage() {
  const navigate = useNavigate();
  onMount(() => {
    if (shiftState.active) navigate('/pos', { replace: true });
  });
  return (
    <main class="page-content">
      <h1>{strings.shell.shift}</h1>
      <p>{strings.pos.noShift}</p>
    </main>
  );
}

function NotFoundPage() {
  return (
    <main class="page-content">
      <h1>404</h1>
      <p>Halaman tidak ditemukan.</p>
    </main>
  );
}
