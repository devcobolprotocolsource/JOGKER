import { For, Show, createSignal, onMount } from 'solid-js';
import { Maximize, Download, RotateCw, Eye, X, Check } from 'lucide-solid';
import { Button, Card, Modal, StatusBadge, Toast, Toolbar, IconButton } from '../../../shared/ui';
import { strings } from '../../../shared/strings';
import { useRealtime, useShortcut } from '../../../shared/hooks';
import { loadPendingVerifications, verifyPayment, getPaymentProofUrl } from '../api/payments';

export function PaymentVerificationPage() {
  const [queue, setQueue] = createSignal<
    Array<{
      id: string;
      order_id: string;
      order_no: string;
      method: 'transfer' | 'ewallet';
      amount: number;
      reference_no: string | null;
      proof_path: string | null;
      status: 'pending_verification' | 'verified' | 'rejected';
      payment_accounts: { provider: string; account_name: string; account_no: string } | null;
      created_at: string;
      profiles: { full_name: string } | null;
    }>
  >([]);
  const [currentIndex, setCurrentIndex] = createSignal(0);
  const [loading, setLoading] = createSignal(false);
  const [proofUrl, setProofUrl] = createSignal<string | null>(null);
  const [proofLoading, setProofLoading] = createSignal(false);
  const [modalOpen, setModalOpen] = createSignal(false);
  const [rejectReason, setRejectReason] = createSignal('');
  const [toast, setToast] = createSignal<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  async function loadQueue() {
    setLoading(true);
    try {
      const result = await loadPendingVerifications();
      if (result.ok) {
        setQueue(result.data);
        setCurrentIndex(0);
        const firstItem = result.data[0];
        if (firstItem) await loadProof(firstItem.id, firstItem.proof_path);
      } else {
        setToast({ type: 'error', message: result.error.message });
      }
    } finally {
      setLoading(false);
    }
  }

  useRealtime({ table: 'payments', onChange: () => void loadQueue() });

  async function loadProof(_paymentId: string, path: string | null) {
    if (!path) {
      setProofUrl(null);
      return;
    }
    setProofLoading(true);
    try {
      const result = await getPaymentProofUrl(path);
      if (result.ok) setProofUrl(result.data);
    } finally {
      setProofLoading(false);
    }
  }

  onMount(() => {
    loadQueue();
    useShortcut([
      { key: 'a', action: () => handleVerify(true) },
      {
        key: 'r',
        action: () => {
          setRejectReason('');
          setModalOpen(true);
        },
      },
      { key: 'ArrowUp', action: () => navigateQueue(-1) },
      { key: 'ArrowDown', action: () => navigateQueue(1) },
    ]);
  });

  function navigateQueue(delta: number) {
    const next = currentIndex() + delta;
    if (next >= 0 && next < queue().length) {
      setCurrentIndex(next);
      const item = queue()[next];
      if (item) loadProof(item.id, item.proof_path);
    }
  }

  async function handleVerify(approve: boolean) {
    const item = queue()[currentIndex()];
    if (!item) return;
    setLoading(true);
    try {
      const result = await verifyPayment(item.id, approve, rejectReason() || undefined);
      if (result.ok) {
        setToast({
          type: 'success',
          message: approve ? strings.payments.verified : strings.payments.rejected,
        });
        setRejectReason('');
        setModalOpen(false);
        loadQueue();
      } else {
        setToast({ type: 'error', message: result.error.message });
      }
    } finally {
      setLoading(false);
    }
  }

  function openProofFullscreen() {
    if (proofUrl()) window.open(proofUrl()!, '_blank');
  }

  function downloadProof() {
    if (proofUrl()) {
      const a = document.createElement('a');
      a.href = proofUrl()!;
      a.download = `bukti-${queue()[currentIndex()]?.order_no}.jpg`;
      a.click();
    }
  }

  const currentItem = queue()[currentIndex()];

  return (
    <div class="page-container verification-page">
      <header class="page-header">
        <div>
          <h1 class="page-title">{strings.payments.verificationTitle}</h1>
          <p class="page-subtitle">{strings.payments.verificationSubtitle}</p>
        </div>
        <div class="page-actions">
          <span class="queue-counter">
            {queue().length > 0 ? `${currentIndex() + 1} / ${queue().length}` : '0 / 0'}
          </span>
        </div>
      </header>

      <div class="verification-grid">
        <div class="proof-panel">
          <Card class="proof-card">
            <div class="proof-header">
              <h2>{strings.payments.proofTitle}</h2>
              <Toolbar gap={2}>
                <IconButton
                  label="Perbesar"
                  icon={Maximize}
                  variant="ghost"
                  onClick={openProofFullscreen}
                />
                <IconButton label="Unduh" icon={Download} variant="ghost" onClick={downloadProof} />
                <IconButton
                  label="Muat ulang"
                  icon={RotateCw}
                  variant="ghost"
                  onClick={() => currentItem && loadProof(currentItem.id, currentItem.proof_path)}
                  disabled={proofLoading() || !currentItem?.proof_path}
                />
              </Toolbar>
            </div>
            <div class="proof-content">
              <Show when={proofLoading()}>
                <div class="proof-loading" role="status">
                  {strings.common.loading}
                </div>
              </Show>
              <Show when={!proofLoading() && proofUrl()}>
                <img
                  src={proofUrl()!}
                  alt={`Bukti pembayaran ${currentItem?.order_no}`}
                  class="proof-image"
                />
              </Show>
              <Show when={!proofLoading() && !proofUrl()}>
                <div class="proof-empty">
                  <Eye size={48} aria-hidden="true" class="text-muted" />
                  <p>{strings.payments.noProof}</p>
                </div>
              </Show>
            </div>
          </Card>
        </div>

        <div class="details-panel">
          <Card class="detail-card">
            <div class="detail-header">
              <h2>{strings.payments.detailTitle}</h2>
              <StatusBadge
                status={
                  currentItem?.status === 'pending_verification'
                    ? 'pending_verification'
                    : (currentItem?.status ?? 'pending_verification')
                }
              />
            </div>
            <dl class="detail-grid">
              <dt>{strings.payments.colOrderNo}</dt>
              <dd class="font-mono tabular-nums">{currentItem?.order_no ?? '-'}</dd>
              <dt>{strings.payments.colMethod}</dt>
              <dd>{currentItem?.method === 'transfer' ? 'Transfer Bank' : 'E-Wallet'}</dd>
              <dt>{strings.payments.colProvider}</dt>
              <dd>{currentItem?.payment_accounts?.provider ?? '-'}</dd>
              <dt>{strings.payments.colAccountName}</dt>
              <dd>{currentItem?.payment_accounts?.account_name ?? '-'}</dd>
              <dt>{strings.payments.colAccountNo}</dt>
              <dd class="font-mono">
                {currentItem?.payment_accounts?.account_no?.replace(/.(?=.{4})/g, '*') ?? '-'}
              </dd>
              <dt>{strings.payments.colAmount}</dt>
              <dd class="text-right font-mono text-lg text-brand">
                {currentItem?.amount
                  ? new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                      maximumFractionDigits: 0,
                    }).format(currentItem.amount)
                  : '-'}
              </dd>
              <dt>{strings.payments.colRef}</dt>
              <dd class="font-mono">{currentItem?.reference_no ?? '-'}</dd>
              <dt>{strings.payments.colCashier}</dt>
              <dd>{currentItem?.profiles?.full_name ?? '-'}</dd>
              <dt>{strings.payments.colDate}</dt>
              <dd>
                {currentItem?.created_at
                  ? new Date(currentItem.created_at).toLocaleString('id-ID', {
                      timeZone: 'Asia/Jakarta',
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })
                  : '-'}
              </dd>
            </dl>
          </Card>

          <div class="action-bar">
            <Button
              variant="danger"
              class="btn-reject"
              onClick={() => {
                setRejectReason('');
                setModalOpen(true);
              }}
              disabled={loading() || queue().length === 0}
            >
              <X size={18} aria-hidden="true" />
              {strings.payments.reject}
            </Button>
            <Button
              variant="primary"
              class="btn-approve"
              onClick={() => handleVerify(true)}
              disabled={loading() || queue().length === 0}
            >
              <Check size={18} aria-hidden="true" />
              {strings.payments.approve}
            </Button>
          </div>

          <Show when={queue().length > 1}>
            <nav class="queue-nav" aria-label="Navigasi antrian">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateQueue(-1)}
                disabled={currentIndex() === 0 || loading()}
                aria-label="Antrian sebelumnya"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  aria-hidden="true"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </Button>
              <span class="queue-indicator" aria-live="polite">
                <For each={queue()}>
                  {(_, i) => <span class={i() === currentIndex() ? 'active' : ''} />}
                </For>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateQueue(1)}
                disabled={currentIndex() === queue().length - 1 || loading()}
                aria-label="Antrian berikutnya"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  aria-hidden="true"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Button>
            </nav>
          </Show>
        </div>
      </div>

      <RejectModal
        open={modalOpen()}
        onClose={() => {
          setModalOpen(false);
          setRejectReason('');
        }}
        onConfirm={(reason) => {
          setRejectReason(reason);
          handleVerify(false);
        }}
      />

      <Show when={toast()}>
        <Toast
          open={true}
          title={toast()!.type === 'success' ? 'Berhasil' : 'Error'}
          message={toast()!.message}
          variant={toast()!.type}
          onClose={() => setToast(null)}
        />
      </Show>
    </div>
  );
}

function RejectModal(props: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = createSignal('');
  const [error, setError] = createSignal('');

  function handleSubmit(e: Event) {
    e.preventDefault();
    if (!reason().trim()) {
      setError('Alasan penolakan wajib diisi');
      return;
    }
    props.onConfirm(reason());
    props.onClose();
  }

  return (
    <Modal open={props.open} onClose={props.onClose} title={strings.payments.rejectTitle} size="md">
      <form onSubmit={handleSubmit} class="dialog-form">
        <p>{strings.payments.rejectDescription}</p>
        <div class="form-group">
          <label>{strings.payments.rejectReason}</label>
          <textarea
            value={reason()}
            onInput={(e) => {
              setReason(e.currentTarget.value);
              setError('');
            }}
            placeholder={strings.payments.rejectPlaceholder}
            rows={4}
            required
            aria-invalid={!!error()}
            aria-describedby={error() ? 'reject-error' : undefined}
          />
          <Show when={error()}>
            <span id="reject-error" class="form-error" role="alert">
              {error()}
            </span>
          </Show>
        </div>
        <div class="dialog-actions">
          <Button type="button" variant="secondary" onClick={props.onClose}>
            {strings.common.cancel}
          </Button>
          <Button type="submit" variant="danger">
            {strings.payments.reject}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
