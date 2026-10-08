import { formatRupiah } from '../lib/format';

export function Money(props: { value: number; class?: string }) {
  return (
    <span class={`money ${props.value < 0 ? 'money--negative' : ''} ${props.class ?? ''}`}>
      {formatRupiah(props.value)}
    </span>
  );
}
