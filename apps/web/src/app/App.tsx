import { Route, Router, useNavigate } from '@solidjs/router';
import { createEffect, lazy, onCleanup, onMount } from 'solid-js';
import type { JSX } from 'solid-js';
import { strings } from '../shared/strings';
import { initializeSession, sessionState, touchSessionActivity } from '../shared/stores/session';
import { initializeConnection, online } from '../shared/stores/connection';
import { refreshShift, shiftState } from '../shared/stores/shift';
import { refreshSettings, settingsState } from '../shared/stores/settings';
import { ProtectedPage } from './guards/ProtectedPages';
import { ForbiddenPage } from '../features/auth/guards/ForbiddenPage';
import { signOut } from '../shared/stores/session';
import { ThemeToggle } from '../shared/ui/ThemeToggle';
import { initializeTheme } from '../shared/theme/theme';

const LoginPage = lazy(() =>
  import('../features/auth/components/LoginPage').then((module) => ({
    default: module.LoginPage,
  }))
);
const PosPage = lazy(() =>
  import('../features/pos/components/PosPage').then((module) => ({
    default: module.PosPage,
  }))
);
const ShiftPage = lazy(() =>
  import('../features/shift/components/ShiftPage').then((module) => ({
    default: module.ShiftPage,
  }))
);
const OrdersPage = lazy(() =>
  import('../features/orders/components/OrdersPage').then((module) => ({
    default: module.OrdersPage,
  }))
);
const OrderDetailPage = lazy(() =>
  import('../features/orders/components/OrderDetailPage').then((module) => ({
    default: module.OrderDetailPage,
  }))
);
const OpenBillPage = lazy(() =>
  import('../features/open-bill/components/OpenBillPage').then((module) => ({
    default: module.OpenBillPage,
  }))
);
const MenuPage = lazy(() =>
  import('../features/menu/components/MenuPage').then((module) => ({
    default: module.MenuPage,
  }))
);
const InventoryPage = lazy(() =>
  import('../features/inventory/components/InventoryPage').then((module) => ({
    default: module.InventoryPage,
  }))
);
const StockOpnamePage = lazy(() =>
  import('../features/inventory/components/StockOpnamePage').then((module) => ({
    default: module.StockOpnamePage,
  }))
);
const StockOpnameDetailPage = lazy(() =>
  import('../features/inventory/components/StockOpnameDetailPage').then((module) => ({
    default: module.StockOpnameDetailPage,
  }))
);

export function App() {
  let disposeConnection: (() => void) | undefined;
  onMount(() => {
    initializeTheme();
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
        path="/pos/open-bill/:id"
        component={() => (
          <ProtectedPage>
            <ApplicationShell>
              <OpenBillPage />
            </ApplicationShell>
          </ProtectedPage>
        )}
      />
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
              <ShiftPage />
            </ApplicationShell>
          </ProtectedPage>
        )}
      />
      <Route
        path="/orders"
        component={() => (
          <ProtectedPage>
            <ApplicationShell>
              <OrdersPage />
            </ApplicationShell>
          </ProtectedPage>
        )}
      />
      <Route
        path="/orders/:id"
        component={() => (
          <ProtectedPage>
            <ApplicationShell>
              <OrderDetailPage />
            </ApplicationShell>
          </ProtectedPage>
        )}
      />
      <Route
        path="/menu"
        component={() => (
          <ProtectedPage>
            <ApplicationShell>
              <MenuPage />
            </ApplicationShell>
          </ProtectedPage>
        )}
      />
      <Route
        path="/inventory/opname/:id"
        component={() => (
          <ProtectedPage>
            <ApplicationShell>
              <StockOpnameDetailPage />
            </ApplicationShell>
          </ProtectedPage>
        )}
      />
      <Route
        path="/inventory/opname"
        component={() => (
          <ProtectedPage>
            <ApplicationShell>
              <StockOpnamePage />
            </ApplicationShell>
          </ProtectedPage>
        )}
      />
      <Route
        path="/inventory"
        component={() => (
          <ProtectedPage>
            <ApplicationShell>
              <InventoryPage />
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
          navigate(shiftState.active ? '/pos' : '/shift', { replace: true })
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

function ApplicationShell(props: { children: JSX.Element }) {
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
          <a href="/menu">{strings.menu.title}</a>
          <a href="/inventory">{strings.inventory.title}</a>
          <a href="/shift">{strings.shell.shift}</a>
        </nav>
        {props.children}
      </div>
    </div>
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
