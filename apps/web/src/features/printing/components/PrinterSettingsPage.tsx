import { For, Show, createSignal, onMount } from 'solid-js';
import { Bluetooth, Printer, X, HelpCircle } from 'lucide-solid';
import { Button, Card, Select, Toast, Badge, Toolbar } from '../../../shared/ui';
import { strings } from '../../../shared/strings';
import { ReceiptPrintView } from './ReceiptPrintView';
import {
  enqueueReceipt,
  getPrintQueue,
  removeQueuedReceipt,
  type QueuedReceipt,
} from '../logic/print-queue';
import type { ReceiptData } from '../../../shared/lib/receipt';

// Web Bluetooth types
interface BluetoothDevice {
  name: string | null;
  gatt: BluetoothRemoteGATTServer | null;
}

interface BluetoothRemoteGATTServer {
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>;
}

interface BluetoothRemoteGATTService {
  getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristic>;
}

interface BluetoothRemoteGATTCharacteristic {
  writeValue(value: BufferSource): Promise<void>;
}

export function PrinterSettingsPage() {
  const [toast, setToast] = createSignal<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [connecting, setConnecting] = createSignal(false);
  const [device, setDevice] = createSignal<BluetoothDevice | null>(null);
  const [characteristic, setCharacteristic] =
    createSignal<BluetoothRemoteGATTCharacteristic | null>(null);
  const [paperWidth, setPaperWidth] = createSignal<58 | 80>(58);
  const [copies, setCopies] = createSignal(1);
  const [supported, setSupported] = createSignal(false);
  const [queuedPrints, setQueuedPrints] = createSignal<QueuedReceipt[]>([]);
  const [printData, setPrintData] = createSignal<ReceiptData | null>(null);
  const [printWidth, setPrintWidth] = createSignal<58 | 80>(58);
  const [printReprint, setPrintReprint] = createSignal(false);

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  onMount(() => {
    setSupported('bluetooth' in navigator);
    const savedWidth = localStorage.getItem('printer.paperWidth');
    const savedCopies = localStorage.getItem('printer.copies');
    try {
      setQueuedPrints(getPrintQueue());
    } catch {
      showToast('error', strings.settings.printQueueLoadFailed);
    }
    if (savedWidth) setPaperWidth(parseInt(savedWidth) as 58 | 80);
    if (savedCopies) setCopies(parseInt(savedCopies) || 1);
  });

  async function handleConnect() {
    if (!('bluetooth' in navigator)) {
      showToast('error', strings.settings.bluetoothNotSupported);
      return;
    }
    setConnecting(true);
    try {
      const nav = navigator as unknown as {
        bluetooth?: {
          requestDevice(options: {
            filters: Array<{ services?: string[] }>;
            optionalServices: string[];
          }): Promise<BluetoothDevice>;
        };
      };
      if (!nav.bluetooth) {
        showToast('error', strings.settings.bluetoothNotSupported);
        setConnecting(false);
        return;
      }
      const dev = await nav.bluetooth.requestDevice({
        filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'],
      });
      const server = await dev.gatt!.connect();
      const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      const char = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
      setDevice(dev);
      setCharacteristic(char);
      localStorage.setItem('printer.deviceName', dev.name || 'Unknown');
      showToast('success', strings.settings.connected);
    } catch (err) {
      if ((err as Error).name !== 'NotFoundError') {
        showToast('error', strings.settings.connectionFailed);
      }
    } finally {
      setConnecting(false);
    }
  }

  function handleDisconnect() {
    device()?.gatt?.disconnect();
    setDevice(null);
    setCharacteristic(null);
    localStorage.removeItem('printer.deviceName');
    showToast('success', strings.settings.disconnected);
  }

  async function handleTestPrint() {
    const char = characteristic();
    if (!char) {
      showToast('error', strings.settings.notConnected);
      return;
    }
    try {
      const encoder = new TextEncoder();
      const testData = new Uint8Array([
        0x1b,
        0x40, // ESC @ - Initialize
        0x1b,
        0x61,
        0x01, // ESC a 1 - Center
        ...encoder.encode('TEST PRINT\n'),
        0x1b,
        0x61,
        0x00, // ESC a 0 - Left
        ...encoder.encode('Printer connected successfully\n'),
        0x1d,
        0x56,
        0x00, // GS V 0 - Cut
      ]);
      await char.writeValue(testData);
      showToast('success', strings.settings.testPrintSent);
    } catch {
      showToast('error', strings.settings.printFailed);
    }
  }

  function handleBrowserTestPrint() {
    const data: ReceiptData = {
      storeName: 'JOKGER',
      header: strings.settings.testPrint,
      orderNo: 'JKG-TEST',
      createdAt: new Date(),
      lines: [{ name: 'Cetak uji', quantity: 1, lineTotal: 1000 }],
      subtotal: 1000,
      discountTotal: 0,
      serviceAmount: 0,
      taxAmount: 0,
      roundingAmount: 0,
      grandTotal: 1000,
      payments: [{ method: 'Tunai', amount: 1000 }],
      change: 0,
    };
    printViaBrowser(data, false);
  }

  function printViaBrowser(data: ReceiptData, reprint: boolean, width: 58 | 80 = paperWidth()) {
    setPrintData(data);
    setPrintWidth(width);
    setPrintReprint(reprint);
    window.setTimeout(() => {
      try {
        window.print();
      } catch {
        enqueueReceipt(data, width, reprint);
        setQueuedPrints(getPrintQueue());
        showToast('error', strings.settings.printQueueSaved);
      }
    }, 0);
  }

  function retryQueuedPrint(receipt: QueuedReceipt) {
    printViaBrowser(receipt.data, receipt.reprint, receipt.paperWidth);
  }

  function removeFromQueue(id: string) {
    removeQueuedReceipt(id);
    setQueuedPrints(getPrintQueue());
  }

  function handlePaperWidthChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value;
    const width = parseInt(value) as 58 | 80;
    setPaperWidth(width);
    localStorage.setItem('printer.paperWidth', String(width));
  }

  function handleCopiesChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value;
    const c = parseInt(value) || 1;
    setCopies(c);
    localStorage.setItem('printer.copies', String(c));
  }

  return (
    <div class="page-container">
      <header class="page-header">
        <div>
          <h1 class="page-title">{strings.settings.printerTitle}</h1>
          <p class="page-subtitle">{strings.settings.printerSubtitle}</p>
        </div>
      </header>

      <div class="settings-grid">
        <Card class="printer-card">
          <header class="card-header">
            <h2>
              <Bluetooth size={20} aria-hidden="true" /> {strings.settings.connection}
            </h2>
          </header>
          <div class="printer-status">
            <Show when={device()}>
              <div class="status-connected">
                <Badge variant="success">{strings.settings.connected}</Badge>
                <span class="device-name">{device()!.name || 'Unknown Device'}</span>
                <Toolbar gap={2}>
                  <Button variant="secondary" onClick={handleTestPrint} disabled={connecting()}>
                    <Printer size={18} aria-hidden="true" />
                    {strings.settings.testPrint}
                  </Button>
                  <Button variant="ghost" class="text-danger" onClick={handleDisconnect}>
                    <X size={18} aria-hidden="true" />
                    {strings.settings.disconnected}
                  </Button>
                </Toolbar>
              </div>
            </Show>
            <Show when={!device()}>
              <div class="status-disconnected">
                <Badge variant="neutral">{strings.settings.disconnected}</Badge>
                <p class="text-muted">{strings.settings.noDevice}</p>
                <Button
                  variant="primary"
                  onClick={handleConnect}
                  disabled={connecting() || !supported()}
                >
                  <Bluetooth size={18} aria-hidden="true" />
                  {connecting() ? strings.settings.connecting : strings.settings.connectPrinter}
                </Button>
              </div>
            </Show>
          </div>
          <Show when={!supported()}>
            <div class="browser-warning">
              <HelpCircle size={20} aria-hidden="true" />
              <span>{strings.settings.bluetoothNotSupported}</span>
              <a
                href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API"
                target="_blank"
                rel="noopener"
              >
                {strings.settings.learnMore}
              </a>
              <Button variant="secondary" onClick={handleBrowserTestPrint}>
                <Printer size={18} aria-hidden="true" />
                {strings.settings.printViaBrowser}
              </Button>
            </div>
          </Show>
        </Card>

        <Card class="printer-card">
          <header class="card-header">
            <h2>
              <Printer size={20} aria-hidden="true" /> {strings.settings.preferences}
            </h2>
          </header>
          <div class="form-group">
            <Select
              label={strings.settings.paperWidthLabel}
              value={String(paperWidth())}
              onChange={handlePaperWidthChange}
              options={[
                { value: '58', label: '58 mm' },
                { value: '80', label: '80 mm' },
              ]}
            />
          </div>
          <div class="form-group">
            <Select
              label={strings.settings.defaultCopies}
              value={String(copies())}
              onChange={handleCopiesChange}
              options={[
                { value: '1', label: '1' },
                { value: '2', label: '2' },
                { value: '3', label: '3' },
              ]}
            />
          </div>
        </Card>

        <Card class="printer-card">
          <header class="card-header">
            <h2>{strings.settings.printQueueTitle}</h2>
          </header>
          <Show
            when={queuedPrints().length > 0}
            fallback={<p>{strings.settings.printQueueEmpty}</p>}
          >
            <ul>
              <For each={queuedPrints()}>
                {(receipt) => (
                  <li>
                    <span>{receipt.data.orderNo}</span>
                    <Toolbar gap={2}>
                      <Button variant="secondary" onClick={() => retryQueuedPrint(receipt)}>
                        {strings.settings.retryPrint}
                      </Button>
                      <Button variant="ghost" onClick={() => removeFromQueue(receipt.id)}>
                        {strings.settings.removeQueuedPrint}
                      </Button>
                    </Toolbar>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </Card>

        <Card class="printer-card">
          <header class="card-header">
            <h2>
              <HelpCircle size={20} aria-hidden="true" /> {strings.settings.help}
            </h2>
          </header>
          <div class="help-content">
            <ul>
              <li>{strings.settings.help1}</li>
              <li>{strings.settings.help2}</li>
              <li>{strings.settings.help3}</li>
              <li>{strings.settings.help4}</li>
            </ul>
          </div>
        </Card>
      </div>

      <Show when={printData()}>
        {(data) => (
          <ReceiptPrintView data={data()} paperWidth={printWidth()} reprint={printReprint()} />
        )}
      </Show>

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
