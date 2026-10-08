import { createSignal, onMount, Show } from 'solid-js';
import { createEffect } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { ArrowRight, CircleDollarSign, ClipboardCheck, DoorOpen } from 'lucide-solid';
import { Button, Card, CurrencyInput, Money, StatusBadge, Textarea } from '../../../shared/ui';
import { strings } from '../../../shared/strings';
import { shiftState, refreshShift } from '../../../shared/stores/shift';
import { closingCashSchema, openingCashSchema } from '../schemas/shift';
import { finishShift, loadShiftSummary, startShift, type ShiftSummary } from '../api/shift';

export function ShiftPage() {
  const navigate = useNavigate();
  const [openingCash, setOpeningCash] = createSignal(0);
  const [actualCash, setActualCash] = createSignal(0);
  const [note, setNote] = createSignal('');
  const [summary, setSummary] = createSignal<ShiftSummary | null>(null);
  const [step, setStep] = createSignal<1 | 2>(1);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal('');
  const [notice, setNotice] = createSignal('');

  onMount(() => {
    void refreshShift();
  });
  createEffect(() => {
    const active = shiftState.active;
    if (!active) {
      setSummary(null);
      return;
    }
    void loadShiftSummary(active.id, active.opening_cash).then((result) => {
      if (result.ok) setSummary(result.data);
      else setError(result.error.message);
    });
  });

  async function open() {
    setError('');
    const parsed = openingCashSchema.safeParse({ openingCash: openingCash() });
    if (!parsed.success) {
      setError(strings.shift.invalidOpeningCash);
      return;
    }
    setLoading(true);
    const result = await startShift(parsed.data.openingCash);
    setLoading(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    await refreshShift();
    setNotice(strings.shift.opened);
  }

  async function close() {
    setError('');
    if (summary()?.openBillCount) {
      setError(strings.shift.openBillsRemain);
      return;
    }
    const parsed = closingCashSchema.safeParse({
      actualCash: actualCash(),
      note: note(),
    });
    if (!parsed.success) {
      setError(strings.shift.invalidActualCash);
      return;
    }
    setLoading(true);
    const result = await finishShift(parsed.data.actualCash, parsed.data.note);
    setLoading(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setStep(1);
    setNotice(strings.shift.closed);
    await refreshShift();
  }

  const difference = () => actualCash() - (summary()?.expectedCash ?? 0);
  return (
    <main class="shift-page page-content">
      <header class="page-heading">
        <div>
          <p class="page-eyebrow">{strings.shell.shift}</p>
          <h1>{strings.shift.title}</h1>
        </div>
        <Show when={shiftState.active}>
          <StatusBadge status="open" />
        </Show>
      </header>
      <Show when={notice()}>
        <p class="form-message" role="status">
          {notice()}
        </p>
      </Show>
      <Show when={error()}>
        <p class="form-message form-message--error" role="alert">
          {error()}
        </p>
      </Show>
      <Show
        when={!shiftState.active}
        fallback={
          <Show when={summary()} fallback={<p role="status">{strings.common.loading}</p>}>
            <section class="shift-summary-grid">
              <Card>
                <span>{strings.shift.openedAt}</span>
                <strong>
                  {new Date(shiftState.active!.opened_at).toLocaleString('id-ID', {
                    timeZone: 'Asia/Jakarta',
                  })}
                </strong>
              </Card>
              <Card>
                <span>{strings.shift.openingCash}</span>
                <Money value={shiftState.active!.opening_cash} />
              </Card>
              <Card>
                <span>{strings.shift.orderCount}</span>
                <strong>{summary()!.orderCount}</strong>
              </Card>
              <Card>
                <span>{strings.shift.expectedCash}</span>
                <Money value={summary()!.expectedCash} />
              </Card>
              <Card>
                <span>{strings.pos.cash}</span>
                <Money value={summary()!.cash} />
              </Card>
              <Card>
                <span>{strings.pos.transfer}</span>
                <Money value={summary()!.transfer} />
              </Card>
              <Card>
                <span>{strings.pos.ewallet}</span>
                <Money value={summary()!.ewallet} />
              </Card>
            </section>
            <Card class="shift-close-card">
              <Show when={summary()!.openBillCount > 0}>
                <p class="form-message form-message--error">
                  {strings.shift.openBillsRemain.replace(
                    '{count}',
                    String(summary()!.openBillCount)
                  )}
                </p>
              </Show>
              <Show
                when={step() === 1}
                fallback={
                  <div class="shift-close-step">
                    <h2>{strings.shift.confirmCashTitle}</h2>
                    <p>
                      {strings.shift.expectedCash}: <Money value={summary()!.expectedCash} />
                    </p>
                    <CurrencyInput
                      label={strings.shift.actualCash}
                      value={actualCash()}
                      onValueChange={setActualCash}
                    />
                    <p
                      class={`shift-difference ${difference() < 0 ? 'shift-difference--negative' : ''}`}
                    >
                      {difference() === 0
                        ? strings.shift.cashExact
                        : difference() < 0
                          ? strings.shift.cashShort.replace(
                              '{amount}',
                              formatAmount(Math.abs(difference()))
                            )
                          : strings.shift.cashOver.replace('{amount}', formatAmount(difference()))}
                    </p>
                    <Textarea
                      label={strings.shift.note}
                      value={note()}
                      maxLength={500}
                      onInput={(event) => setNote(event.currentTarget.value)}
                    />
                    <div class="dialog-actions">
                      <Button variant="secondary" onClick={() => setStep(1)}>
                        {strings.common.cancel}
                      </Button>
                      <Button
                        variant="danger"
                        loading={loading()}
                        disabled={loading() || summary()!.openBillCount > 0}
                        onClick={close}
                      >
                        {strings.shift.confirmClose}
                      </Button>
                    </div>
                  </div>
                }
              >
                <div class="shift-close-step">
                  <h2>{strings.shift.closeTitle}</h2>
                  <p>
                    {strings.shift.openBills}: <strong>{summary()!.openBillCount}</strong>
                  </p>
                  <p>
                    {strings.shift.expectedCash}: <Money value={summary()!.expectedCash} />
                  </p>
                  <Button
                    variant="primary"
                    disabled={summary()!.openBillCount > 0}
                    onClick={() => {
                      setActualCash(summary()!.expectedCash);
                      setStep(2);
                    }}
                  >
                    <ClipboardCheck size={18} aria-hidden={true} />
                    {strings.shift.nextStep}
                  </Button>
                </div>
              </Show>
            </Card>
          </Show>
        }
      >
        <Card class="shift-open-card">
          <CircleDollarSign size={32} aria-hidden={true} />
          <h2>{strings.shift.openTitle}</h2>
          <p>{strings.shift.openDescription}</p>
          <CurrencyInput
            label={strings.shift.openingCash}
            value={openingCash()}
            onValueChange={setOpeningCash}
          />
          <Button
            variant="primary"
            size="lg"
            loading={loading()}
            disabled={loading()}
            onClick={open}
          >
            <DoorOpen size={18} aria-hidden={true} />
            {strings.shift.openButton}
            <ArrowRight size={18} aria-hidden={true} />
          </Button>
        </Card>
      </Show>
      <Button variant="ghost" onClick={() => navigate('/pos')}>
        {strings.authorization.backToPos}
      </Button>
    </main>
  );
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(value);
}
