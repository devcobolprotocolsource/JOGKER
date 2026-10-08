import { createEffect, createMemo, createSignal, For, Show } from 'solid-js';
import type { PaymentLine, PaymentAccount } from '../api/pos';
import { checkoutSchema } from '../schemas/checkout';
import { Modal } from '../../../shared/ui/Modal';
import { Button } from '../../../shared/ui/Button';
import { CurrencyInput } from '../../../shared/ui/CurrencyInput';
import { Money } from '../../../shared/ui/Money';
import { RadioGroup } from '../../../shared/ui/RadioGroup';
import { Select } from '../../../shared/ui/Select';
import { strings } from '../../../shared/strings';

type PaymentMethod = 'cash' | 'transfer' | 'ewallet' | 'split';
interface PaymentRow {
  key: number;
  method: 'cash' | 'transfer' | 'ewallet';
  amount: number;
  accountId: string;
  reference: string;
  received: number;
}

export function PaymentDialog(props: {
  open: boolean;
  total: number;
  accounts: PaymentAccount[];
  loading: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (lines: PaymentLine[]) => void;
}) {
  const [method, setMethod] = createSignal<PaymentMethod>('cash');
  const [received, setReceived] = createSignal(0);
  const [accountId, setAccountId] = createSignal('');
  const [reference, setReference] = createSignal('');
  const [rows, setRows] = createSignal<PaymentRow[]>([]);
  const [inputError, setInputError] = createSignal('');
  const change = createMemo(() => Math.max(0, received() - props.total));
  const remaining = createMemo(() =>
    Math.max(0, props.total - rows().reduce((sum, row) => sum + row.amount, 0))
  );
  createEffect(() => {
    if (props.open) setReceived(props.total);
  });

  function chooseMethod(next: string) {
    setMethod(next as PaymentMethod);
    setInputError('');
    if (next === 'split' && rows().length === 0)
      setRows([
        {
          key: Date.now(),
          method: 'cash',
          amount: 0,
          accountId: '',
          reference: '',
          received: 0,
        },
      ]);
  }

  function submit() {
    if (method() === 'cash') {
      const parsed = checkoutSchema.safeParse({
        method: 'cash',
        amountReceived: received(),
        cashPart: props.total,
      });
      if (!parsed.success || received() < props.total) {
        setInputError(strings.pos.cashTooLow);
        return;
      }
      props.onSubmit([{ method: 'cash', amount: props.total, received_amount: received() }]);
      return;
    }
    if (method() === 'split') {
      if (
        remaining() !== 0 ||
        rows().some((row) => row.amount < 1 || (row.method !== 'cash' && !row.accountId))
      ) {
        setInputError(strings.pos.splitMismatch);
        return;
      }
      props.onSubmit(
        rows().map((row) => ({
          method: row.method,
          amount: row.amount,
          payment_account_id: row.accountId || undefined,
          reference_no: row.reference || undefined,
          received_amount: row.method === 'cash' ? Math.max(row.received, row.amount) : undefined,
        }))
      );
      return;
    }
    const parsed = checkoutSchema.safeParse({
      method: method(),
      amountReceived: 0,
      cashPart: 0,
      paymentAccountId: accountId(),
      referenceNo: reference(),
    });
    if (!parsed.success) {
      setInputError(strings.pos.chooseAccount);
      return;
    }
    const transferMethod = method();
    if (transferMethod !== 'transfer' && transferMethod !== 'ewallet') return;
    props.onSubmit([
      {
        method: transferMethod,
        amount: props.total,
        payment_account_id: accountId(),
        reference_no: reference(),
      },
    ]);
  }

  return (
    <Modal open={props.open} title={strings.pos.paymentTitle} onClose={props.onClose} size="md">
      <div class="payment-form">
        <div class="payment-total">
          <span>{strings.pos.amountDue}</span>
          <Money value={props.total} />
        </div>
        <RadioGroup
          label={strings.pos.paymentMethod}
          name="payment-method"
          value={method()}
          onChange={chooseMethod}
          orientation="horizontal"
          options={[
            { value: 'cash', label: strings.pos.cash },
            { value: 'transfer', label: strings.pos.transfer },
            { value: 'ewallet', label: strings.pos.ewallet },
            { value: 'split', label: strings.pos.split },
          ]}
        />
        <Show when={method() === 'cash'}>
          <CurrencyInput
            label={strings.pos.cashReceived}
            value={received()}
            onValueChange={setReceived}
          />
          <div class="quick-cash">
            <For each={[50000, 100000, 150000]}>
              {(amount) => (
                <Button variant="secondary" onClick={() => setReceived(amount)}>
                  {new Intl.NumberFormat('id-ID').format(amount)}
                </Button>
              )}
            </For>
            <Button variant="ghost" onClick={() => setReceived(props.total)}>
              {strings.pos.exactCash}
            </Button>
          </div>
          <div class="payment-change">
            <span>{strings.pos.change}</span>
            <Money value={change()} />
          </div>
        </Show>
        <Show when={method() === 'transfer' || method() === 'ewallet'}>
          <Select
            label={strings.pos.paymentAccount}
            value={accountId()}
            onChange={(event) => setAccountId(event.currentTarget.value)}
            options={[
              { value: '', label: strings.pos.chooseAccount },
              ...props.accounts
                .filter((account) => account.method === method())
                .map((account) => ({
                  value: account.id,
                  label: `${account.provider} · ${account.account_name} · ${account.account_no}`,
                })),
            ]}
          />
          <label class="field">
            <span class="field__label">{strings.pos.referenceNo}</span>
            <input
              class="input"
              value={reference()}
              onInput={(event) => setReference(event.currentTarget.value)}
            />
          </label>
        </Show>
        <Show when={method() === 'split'}>
          <p class="payment-remaining">
            {strings.pos.remaining}: <Money value={remaining()} />
          </p>
          <For each={rows()}>
            {(row) => (
              <div class="split-row">
                <Select
                  label={strings.pos.paymentMethod}
                  value={row.method}
                  onChange={(event) => updateRow(row.key, 'method', event.currentTarget.value)}
                  options={[
                    { value: 'cash', label: strings.pos.cash },
                    { value: 'transfer', label: strings.pos.transfer },
                    { value: 'ewallet', label: strings.pos.ewallet },
                  ]}
                />
                <CurrencyInput
                  label={strings.pos.amount}
                  value={row.amount}
                  onValueChange={(value) => updateRow(row.key, 'amount', value)}
                />
                <Show when={row.method !== 'cash'}>
                  <Select
                    label={strings.pos.paymentAccount}
                    value={row.accountId}
                    onChange={(event) => updateRow(row.key, 'accountId', event.currentTarget.value)}
                    options={[
                      { value: '', label: strings.pos.chooseAccount },
                      ...props.accounts
                        .filter((account) => account.method === row.method)
                        .map((account) => ({
                          value: account.id,
                          label: `${account.provider} · ${account.account_no}`,
                        })),
                    ]}
                  />
                </Show>
              </div>
            )}
          </For>
          <Button
            variant="secondary"
            onClick={() =>
              setRows([
                ...rows(),
                {
                  key: Date.now(),
                  method: 'cash',
                  amount: remaining(),
                  accountId: '',
                  reference: '',
                  received: 0,
                },
              ])
            }
          >
            {strings.pos.addPaymentLine}
          </Button>
        </Show>
        <Show when={inputError() || props.error}>
          <p class="form-message form-message--error" role="alert">
            {inputError() || props.error}
          </p>
        </Show>
        <Button
          variant="primary"
          size="lg"
          loading={props.loading}
          disabled={props.loading || props.total < 1}
          onClick={submit}
        >
          {method() === 'cash' ? strings.pos.finishPrint : strings.pos.sendVerification}
        </Button>
      </div>
    </Modal>
  );

  function updateRow(key: number, field: keyof PaymentRow, value: string | number) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, [field]: value } : row))
    );
  }
}
