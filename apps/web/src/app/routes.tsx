import { Route, Router } from '@solidjs/router';
import { lazy } from 'solid-js';
import { RequireAuth } from './guards/RequireAuth';
import { RequireRole } from './guards/RequireRole';
import { AppShell } from './layouts/AppShell';
import { PosLayout } from './layouts/PosLayout';
import { NotFoundPage } from '../features/auth/components/NotFoundPage';
import { ForbiddenPage } from '../features/auth/guards/ForbiddenPage';
import { useNavigate } from '@solidjs/router';
import { createEffect } from 'solid-js';
import { sessionState } from '../shared/stores/session';
import { refreshShift, shiftState } from '../shared/stores/shift';

const LoginPage = lazy(() =>
  import('../features/auth/components/LoginPage').then((m) => ({ default: m.LoginPage }))
);
const PosPage = lazy(() =>
  import('../features/pos/components/PosPage').then((m) => ({ default: m.PosPage }))
);
const OpenBillPage = lazy(() =>
  import('../features/open-bill/components/OpenBillPage').then((m) => ({ default: m.OpenBillPage }))
);
const ShiftPage = lazy(() =>
  import('../features/shift/components/ShiftPage').then((m) => ({ default: m.ShiftPage }))
);
const OrdersPage = lazy(() =>
  import('../features/orders/components/OrdersPage').then((m) => ({ default: m.OrdersPage }))
);
const OrderDetailPage = lazy(() =>
  import('../features/orders/components/OrderDetailPage').then((m) => ({
    default: m.OrderDetailPage,
  }))
);
const TransactionHistoryPage = lazy(() =>
  import('../features/history/components/TransactionHistoryPage').then((m) => ({
    default: m.TransactionHistoryPage,
  }))
);
const MenuPage = lazy(() =>
  import('../features/menu/components/MenuPage').then((m) => ({ default: m.MenuPage }))
);
const InventoryPage = lazy(() =>
  import('../features/inventory/components/InventoryPage').then((m) => ({
    default: m.InventoryPage,
  }))
);
const StockOpnamePage = lazy(() =>
  import('../features/inventory/components/StockOpnamePage').then((m) => ({
    default: m.StockOpnamePage,
  }))
);
const StockOpnameDetailPage = lazy(() =>
  import('../features/inventory/components/StockOpnameDetailPage').then((m) => ({
    default: m.StockOpnameDetailPage,
  }))
);
const VouchersPage = lazy(() =>
  import('../features/vouchers/components/VouchersPage').then((m) => ({ default: m.VouchersPage }))
);
const PaymentAccountsPage = lazy(() =>
  import('../features/payments/components/PaymentAccountsPage').then((m) => ({
    default: m.PaymentAccountsPage,
  }))
);
const PaymentVerificationPage = lazy(() =>
  import('../features/payments/components/PaymentVerificationPage').then((m) => ({
    default: m.PaymentVerificationPage,
  }))
);
const ReportsPage = lazy(() =>
  import('../features/reports/components/ReportsPage').then((m) => ({ default: m.ReportsPage }))
);
const SettingsPage = lazy(() =>
  import('../features/settings/components/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);
const BrandingPage = lazy(() =>
  import('../features/settings/components/BrandingPage').then((m) => ({ default: m.BrandingPage }))
);
const StaffPage = lazy(() =>
  import('../features/settings/components/StaffPage').then((m) => ({ default: m.StaffPage }))
);
const PrinterSettingsPage = lazy(() =>
  import('../features/printing/components/PrinterSettingsPage').then((m) => ({
    default: m.PrinterSettingsPage,
  }))
);
const AuditLogPage = lazy(() =>
  import('../features/audit/components/AuditLogPage').then((m) => ({ default: m.AuditLogPage }))
);

export function Routes() {
  return (
    <Router>
      <Route path="/login" component={LoginPage} />
      <Route path="/403" component={ForbiddenRoute} />
      <Route
        path="/pos/open-bill/:id"
        component={() => (
          <RequireAuth>
            <RequireRole roles={['admin', 'super_admin']}>
              <PosLayout>
                <OpenBillPage />
              </PosLayout>
            </RequireRole>
          </RequireAuth>
        )}
      />
      <Route
        path="/pos"
        component={() => (
          <RequireAuth>
            <RequireRole roles={['admin', 'super_admin']}>
              <PosLayout>
                <PosPage />
              </PosLayout>
            </RequireRole>
          </RequireAuth>
        )}
      />
      <Route
        path="/shift"
        component={() => (
          <RequireAuth>
            <RequireRole roles={['admin', 'super_admin']}>
              <AppShell>
                <ShiftPage />
              </AppShell>
            </RequireRole>
          </RequireAuth>
        )}
      />
      <Route
        path="/history"
        component={() => (
          <RequireAuth>
            <RequireRole roles={['admin', 'super_admin']}>
              <AppShell>
                <TransactionHistoryPage />
              </AppShell>
            </RequireRole>
          </RequireAuth>
        )}
      />
      <Route
        path="/orders"
        component={() => (
          <RequireAuth>
            <RequireRole roles={['admin', 'super_admin']}>
              <AppShell>
                <OrdersPage />
              </AppShell>
            </RequireRole>
          </RequireAuth>
        )}
      />
      <Route
        path="/orders/:id"
        component={() => (
          <RequireAuth>
            <RequireRole roles={['admin', 'super_admin']}>
              <AppShell>
                <OrderDetailPage />
              </AppShell>
            </RequireRole>
          </RequireAuth>
        )}
      />
      <Route
        path="/menu"
        component={() => (
          <RequireAuth>
            <RequireRole roles={['admin', 'super_admin']}>
              <AppShell>
                <MenuPage />
              </AppShell>
            </RequireRole>
          </RequireAuth>
        )}
      />
      <Route
        path="/inventory/opname/:id"
        component={() => (
          <RequireAuth>
            <RequireRole roles={['admin', 'super_admin']}>
              <AppShell>
                <StockOpnameDetailPage />
              </AppShell>
            </RequireRole>
          </RequireAuth>
        )}
      />
      <Route
        path="/inventory/opname"
        component={() => (
          <RequireAuth>
            <RequireRole roles={['admin', 'super_admin']}>
              <AppShell>
                <StockOpnamePage />
              </AppShell>
            </RequireRole>
          </RequireAuth>
        )}
      />
      <Route
        path="/inventory"
        component={() => (
          <RequireAuth>
            <RequireRole roles={['admin', 'super_admin']}>
              <AppShell>
                <InventoryPage />
              </AppShell>
            </RequireRole>
          </RequireAuth>
        )}
      />
      <Route
        path="/vouchers"
        component={() => (
          <RequireAuth>
            <RequireRole roles={['admin', 'super_admin']}>
              <AppShell>
                <VouchersPage />
              </AppShell>
            </RequireRole>
          </RequireAuth>
        )}
      />
      <Route
        path="/payments/verify"
        component={() => (
          <RequireAuth>
            <RequireRole roles={['admin', 'super_admin']}>
              <AppShell>
                <PaymentVerificationPage />
              </AppShell>
            </RequireRole>
          </RequireAuth>
        )}
      />
      <Route
        path="/payments"
        component={() => (
          <RequireAuth>
            <RequireRole roles={['admin', 'super_admin']}>
              <AppShell>
                <PaymentAccountsPage />
              </AppShell>
            </RequireRole>
          </RequireAuth>
        )}
      />
      <Route
        path="/reports"
        component={() => (
          <RequireAuth>
            <RequireRole roles={['admin', 'super_admin']}>
              <AppShell>
                <ReportsPage />
              </AppShell>
            </RequireRole>
          </RequireAuth>
        )}
      />
      <Route
        path="/settings/branding"
        component={() => (
          <RequireAuth>
            <RequireRole roles={['super_admin']}>
              <AppShell>
                <BrandingPage />
              </AppShell>
            </RequireRole>
          </RequireAuth>
        )}
      />
      <Route
        path="/settings/staff"
        component={() => (
          <RequireAuth>
            <RequireRole roles={['super_admin']}>
              <AppShell>
                <StaffPage />
              </AppShell>
            </RequireRole>
          </RequireAuth>
        )}
      />
      <Route
        path="/settings/printer"
        component={() => (
          <RequireAuth>
            <RequireRole roles={['super_admin']}>
              <AppShell>
                <PrinterSettingsPage />
              </AppShell>
            </RequireRole>
          </RequireAuth>
        )}
      />
      <Route
        path="/settings"
        component={() => (
          <RequireAuth>
            <RequireRole roles={['super_admin']}>
              <AppShell>
                <SettingsPage />
              </AppShell>
            </RequireRole>
          </RequireAuth>
        )}
      />
      <Route
        path="/audit"
        component={() => (
          <RequireAuth>
            <RequireRole roles={['super_admin']}>
              <AppShell>
                <AuditLogPage />
              </AppShell>
            </RequireRole>
          </RequireAuth>
        )}
      />
      <Route
        path="/*rest"
        component={() => (
          <RequireAuth>
            <RequireRole roles={['admin', 'super_admin']}>
              <AppShell>
                <NotFoundPage />
              </AppShell>
            </RequireRole>
          </RequireAuth>
        )}
      />
      <Route path="/" component={RootRedirect} />
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
    <div class="route-loading" role="status">
      Memuat…
    </div>
  );
}

function ForbiddenRoute() {
  return (
    <RequireAuth>
      <ForbiddenPage />
    </RequireAuth>
  );
}
