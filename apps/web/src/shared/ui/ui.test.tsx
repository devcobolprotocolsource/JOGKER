import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Search } from 'lucide-solid';
import { Button } from './Button';
import { CurrencyInput } from './CurrencyInput';
import { Input } from './Input';
import { Switch } from './Switch';
import { Tabs } from './Tabs';
import { ConfirmDialog } from './ConfirmDialog';
import { Toast } from './Toast';
import { Pagination } from './Pagination';
import { SearchInput } from './SearchInput';
import { StatusBadge } from './StatusBadge';
import { Select } from './Select';
import { Textarea } from './Textarea';
import { Banner } from './Banner';
import { EmptyState } from './EmptyState';
import { Money } from './Money';
import { DatePicker } from './DatePicker';
import { Checkbox } from './Checkbox';
import { RadioGroup } from './RadioGroup';
import { Combobox } from './Combobox';
import { DataTable } from './DataTable';
import { CartPanel } from '../../features/pos/components/CartPanel';
import { ModifierDialog } from '../../features/pos/components/ModifierDialog';
import { PaymentDialog } from '../../features/pos/components/PaymentDialog';

afterEach(cleanup);

describe('shared UI', () => {
  it('keeps button width and exposes disabled and loading states', () => {
    const { unmount } = render(() => <Button loading>Bayar</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText('Memproses…')).toBeInTheDocument();
    unmount();
    render(() => <Button disabled>Bayar</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('associates input errors with the field and selects an option', () => {
    render(() => (
      <>
        <Input label="Email" type="email" error="Format salah" />
        <Select label="Kategori" options={[{ value: 'coffee', label: 'Kopi' }]} />
      </>
    ));
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Format salah');
    expect(screen.getByLabelText('Kategori')).toHaveValue('coffee');
  });

  it('accepts only digits in the rupiah input and reports integer values', () => {
    const change = vi.fn();
    render(() => <CurrencyInput label="Nominal" value={0} onValueChange={change} />);
    fireEvent.focus(screen.getByLabelText('Nominal'));
    fireEvent.input(screen.getByLabelText('Nominal'), {
      target: { value: 'Rp 12.500' },
    });
    expect(change).toHaveBeenLastCalledWith(12500);
  });

  it('updates switch, checkbox, and radio choices accessibly', () => {
    const change = vi.fn();
    render(() => (
      <>
        <Switch label="Aktif" checked={false} onChange={change} />
        <Checkbox label="Tandai" checked={false} onChange={change} />
        <RadioGroup
          label="Metode"
          name="method"
          value="cash"
          onChange={change}
          options={[
            { value: 'cash', label: 'Tunai' },
            { value: 'transfer', label: 'Transfer' },
          ]}
        />
      </>
    ));
    fireEvent.click(screen.getByRole('switch', { name: 'Aktif' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Tandai' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Transfer' }));
    expect(change).toHaveBeenNthCalledWith(1, true);
    expect(change).toHaveBeenNthCalledWith(3, 'transfer');
  });

  it('moves tabs with arrow keys and updates the active tab', () => {
    const change = vi.fn();
    render(() => (
      <Tabs
        label="Status"
        value="new"
        onChange={change}
        tabs={[
          { value: 'new', label: 'Baru' },
          { value: 'ready', label: 'Siap', count: 2 },
        ]}
      />
    ));
    fireEvent.keyDown(screen.getByRole('tab', { name: /Baru/ }), {
      key: 'ArrowRight',
    });
    expect(change).toHaveBeenCalledWith('ready');
  });

  it('filters a combobox list and selects an option', () => {
    const change = vi.fn();
    render(() => (
      <Combobox
        label="Pelanggan"
        value=""
        onChange={change}
        options={[
          { value: 'a', label: 'Andi' },
          { value: 'b', label: 'Budi' },
        ]}
      />
    ));
    fireEvent.click(screen.getByRole('button', { name: 'Pelanggan' }));
    fireEvent.input(screen.getByRole('combobox', { name: 'Cari pilihan' }), {
      target: { value: 'bud' },
    });
    expect(screen.getByRole('option', { name: 'Budi' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Andi' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: 'Budi' }));
    expect(change).toHaveBeenCalledWith('b');
  });

  it('sorts table columns and selects individual rows', () => {
    const select = vi.fn();
    render(() => (
      <DataTable
        caption="Staff"
        rows={[
          { id: '1', name: 'Budi' },
          { id: '2', name: 'Andi' },
        ]}
        rowKey={(row) => row.id}
        selectedKeys={[]}
        onSelectionChange={select}
        columns={[
          {
            key: 'name',
            label: 'Nama',
            value: (row) => row.name,
            sortable: true,
          },
        ]}
      />
    ));
    fireEvent.click(screen.getByRole('button', { name: 'Nama' }));
    expect(screen.getAllByRole('cell')[1]).toHaveTextContent('Andi');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Pilih baris 2' }));
    expect(select).toHaveBeenCalledWith(['2']);
  });

  it('updates cart quantity, opens checkout, and expands the mobile cart sheet', () => {
    const quantity = vi.fn();
    const pay = vi.fn();
    const matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal('matchMedia', matchMedia);
    const item = {
      key: 'cart-line-1',
      menu: {
        id: 'menu-1',
        category_id: 'coffee',
        name: 'Americano',
        description: null,
        price: 18000,
        image_path: null,
        is_available: true,
        groups: [],
      },
      modifiers: [],
      quantity: 1,
      note: '',
    };
    render(() => (
      <CartPanel
        items={[item]}
        subtotal={18000}
        discount={0}
        service={0}
        tax={0}
        rounding={0}
        total={18000}
        voucherCode=""
        voucherInput=""
        voucherError=""
        onVoucherInput={() => undefined}
        onApplyVoucher={() => undefined}
        onClearVoucher={() => undefined}
        onQuantityChange={quantity}
        onRemove={() => undefined}
        onClear={() => undefined}
        onPay={pay}
        onOpenBill={() => undefined}
      />
    ));
    const panel = screen.getByRole('complementary', { name: 'Keranjang' });
    const expand = screen.getByRole('button', { name: /Keranjang/ });
    expect(expand).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(expand);
    expect(panel.className).not.toContain('cart-panel--compact');
    fireEvent.click(screen.getByRole('button', { name: 'Tambah jumlah' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bayar' }));
    expect(quantity).toHaveBeenCalledWith('cart-line-1', 2);
    expect(pay).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it('requires mandatory modifiers before adding the menu item', () => {
    const add = vi.fn();
    const item = {
      id: 'espresso',
      category_id: 'coffee',
      name: 'Espresso',
      description: null,
      price: 16000,
      image_path: null,
      is_available: true,
      groups: [
        {
          id: 'size',
          name: 'Ukuran',
          min_select: 1,
          max_select: 1,
          options: [
            {
              id: 'single',
              group_id: 'size',
              name: 'Single',
              extra_price: 0,
              is_active: true,
            },
          ],
        },
      ],
    };
    render(() => <ModifierDialog item={item} onClose={() => undefined} onAdd={add} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tambahkan ke keranjang' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Pilih Ukuran');
    fireEvent.click(screen.getByRole('checkbox', { name: /Single/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Tambahkan ke keranjang' }));
    expect(add).toHaveBeenCalledWith(item, [item.groups[0]!.options[0]], '');
  });

  it('completes a cash checkout with exact payment and no optimistic mutation', () => {
    const submit = vi.fn();
    render(() => (
      <PaymentDialog
        open
        total={18000}
        accounts={[]}
        loading={false}
        error=""
        onClose={() => undefined}
        onSubmit={submit}
      />
    ));
    fireEvent.click(screen.getByRole('button', { name: 'Selesai & Cetak' }));
    expect(submit).toHaveBeenCalledWith([
      { method: 'cash', amount: 18000, received_amount: 18000 },
    ]);
  });

  it('requires a reason before confirming destructive actions', () => {
    const confirm = vi.fn();
    render(() => (
      <ConfirmDialog
        open
        title="Void item"
        description="Hapus item?"
        destructive
        requireReason
        confirmLabel="Void"
        cancelLabel="Batal"
        onConfirm={confirm}
        onClose={() => undefined}
      />
    ));
    expect(screen.getByRole('button', { name: 'Void' })).toBeDisabled();
    fireEvent.input(screen.getByLabelText('Alasan'), {
      target: { value: 'Salah input' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Void' }));
    expect(confirm).toHaveBeenCalledWith('Salah input');
  });

  it('announces toast, banner, and status text with semantics', () => {
    render(() => (
      <>
        <Toast open title="Tersimpan" variant="success" onClose={() => undefined} />
        <Banner variant="warning">Stok menipis</Banner>
        <StatusBadge status="pending_verification" />
      </>
    ));
    expect(screen.getByText('Tersimpan')).toBeInTheDocument();
    expect(screen.getByText('Stok menipis')).toBeInTheDocument();
    expect(screen.getByText('Menunggu verifikasi')).toBeInTheDocument();
  });

  it('debounces search input and clears the query', async () => {
    vi.useFakeTimers();
    const search = vi.fn();
    render(() => <SearchInput label="Cari pesanan" onSearch={search} />);
    fireEvent.input(screen.getByRole('searchbox'), {
      target: { value: 'JKG-1' },
    });
    vi.advanceTimersByTime(250);
    expect(search).toHaveBeenCalledWith('JKG-1');
    fireEvent.click(screen.getByRole('button', { name: 'Hapus pencarian' }));
    vi.advanceTimersByTime(250);
    expect(search).toHaveBeenLastCalledWith('');
    vi.useRealTimers();
  });

  it('paginates, formats money, and chooses a date preset', () => {
    const page = vi.fn();
    const date = vi.fn();
    render(() => (
      <>
        <Pagination page={1} pageSize={25} total={80} onPageChange={page} />
        <Money value={12500} />
        <DatePicker label="Tanggal" value="2026-10-08" onChange={date} />
        <EmptyState icon={Search} title="Kosong" description="Tidak ada data" />
        <Textarea label="Catatan" value="abc" maxLength={10} />
      </>
    ));
    fireEvent.click(screen.getByRole('button', { name: 'Halaman berikutnya' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hari ini' }));
    expect(page).toHaveBeenCalledWith(2);
    expect(date).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
    expect(
      screen.getByText((_, element) => element?.textContent === 'Rp 12.500')
    ).toBeInTheDocument();
    expect(screen.getByText('3/10')).toBeInTheDocument();
  });
});
