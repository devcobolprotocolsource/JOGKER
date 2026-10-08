import { Check, CircleDot, Flame, X, Bell, Clock3 } from 'lucide-solid';
import { Dynamic } from 'solid-js/web';
import { strings } from '../strings';

type Status =
  | 'new'
  | 'processing'
  | 'ready'
  | 'completed'
  | 'cancelled'
  | 'pending_verification'
  | 'verified'
  | 'rejected'
  | 'open'
  | 'closed';
const statusInfo: Record<Status, { label: string; variant: string; icon: typeof Check }> = {
  new: { label: strings.sharedUi.status.new, variant: 'info', icon: CircleDot },
  processing: {
    label: strings.sharedUi.status.processing,
    variant: 'warning',
    icon: Flame,
  },
  ready: { label: strings.sharedUi.status.ready, variant: 'brand', icon: Bell },
  completed: {
    label: strings.sharedUi.status.completed,
    variant: 'success',
    icon: Check,
  },
  cancelled: {
    label: strings.sharedUi.status.cancelled,
    variant: 'danger',
    icon: X,
  },
  pending_verification: {
    label: strings.sharedUi.status.pendingVerification,
    variant: 'warning',
    icon: Clock3,
  },
  verified: {
    label: strings.sharedUi.status.verified,
    variant: 'success',
    icon: Check,
  },
  rejected: {
    label: strings.sharedUi.status.rejected,
    variant: 'danger',
    icon: X,
  },
  open: {
    label: strings.sharedUi.status.open,
    variant: 'success',
    icon: CircleDot,
  },
  closed: {
    label: strings.sharedUi.status.closed,
    variant: 'neutral',
    icon: X,
  },
};

export function StatusBadge(props: { status: Status }) {
  const info = () => statusInfo[props.status];
  return (
    <span class={`status-badge status-badge--${info().variant}`}>
      <Dynamic component={info().icon} size={16} aria-hidden={true} />
      {info().label}
    </span>
  );
}
