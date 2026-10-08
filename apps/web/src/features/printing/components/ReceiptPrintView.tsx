import { For, Show } from 'solid-js';
import { formatDateJakarta, formatTimeJakarta } from '../../../shared/lib/format';
import { formatRupiah } from '../../../shared/lib/format';
import type { PaperWidth, ReceiptData } from '../../../shared/lib/receipt';
import './print.css';

export function ReceiptPrintView(props: {
  data: ReceiptData;
  paperWidth: PaperWidth;
  reprint?: boolean;
}) {
  return (
    <article
      class={`receipt-print receipt-print--${props.paperWidth}`}
      aria-label={`Struk ${props.data.orderNo}`}
    >
      <header>
        <h1>{props.data.storeName}</h1>
        <p>{props.data.address}</p>
        <p>{props.data.phone}</p>
        <p>{props.data.header}</p>
      </header>
      <hr />
      <Show when={props.reprint}>
        <p>REPRINT</p>
      </Show>
      <p>{props.data.orderNo}</p>
      <p>
        {formatDateJakarta(props.data.createdAt)} {formatTimeJakarta(props.data.createdAt)}
      </p>
      <p>{props.data.tableLabel}</p>
      <hr />
      <For each={props.data.lines}>
        {(line) => (
          <section class="receipt-print__line">
            <strong>{line.name}</strong>
            <For each={line.modifiers ?? []}>{(modifier) => <small>+ {modifier}</small>}</For>
            <div>
              <span>{line.quantity} ×</span>
              <span>{formatRupiah(line.lineTotal)}</span>
            </div>
          </section>
        )}
      </For>
      <hr />
      <ReceiptTotal label="Subtotal" amount={props.data.subtotal} />
      <Show when={props.data.discountTotal > 0}>
        <ReceiptTotal
          label={`Diskon ${props.data.voucherCode ?? ''}`}
          amount={-props.data.discountTotal}
        />
      </Show>
      <Show when={props.data.serviceAmount > 0}>
        <ReceiptTotal label="Layanan" amount={props.data.serviceAmount} />
      </Show>
      <Show when={props.data.taxAmount > 0}>
        <ReceiptTotal label="PB1" amount={props.data.taxAmount} />
      </Show>
      <Show when={props.data.roundingAmount !== 0}>
        <ReceiptTotal label="Pembulatan" amount={props.data.roundingAmount} />
      </Show>
      <ReceiptTotal label="TOTAL" amount={props.data.grandTotal} />
      <For each={props.data.payments}>
        {(payment) => <ReceiptTotal label={payment.method} amount={payment.amount} />}
      </For>
      <Show when={props.data.change > 0}>
        <ReceiptTotal label="Kembalian" amount={props.data.change} />
      </Show>
      <hr />
      <footer>{props.data.footer}</footer>
    </article>
  );
}

function ReceiptTotal(props: { label: string; amount: number }) {
  return (
    <div class="receipt-print__total">
      <span>{props.label}</span>
      <span>{formatRupiah(props.amount)}</span>
    </div>
  );
}
