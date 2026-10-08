import { For, Show, createSignal } from 'solid-js';
import { Save, Palette, Font, Upload, Check, AlertTriangle } from 'lucide-solid';
import {
  Button,
  Card,
  Input,
  CurrencyInput,
  Select,
  Switch,
  Toast,
  Toolbar,
  IconButton,
  Badge,
} from '../../../shared/ui';
import { strings } from '../../../shared/strings';
import { applyColorTokens, getContrastRatio } from '../../../shared/theme/theme';
import {
  createSettingsResource,
  createStaffResource,
  handleUpdateSettings,
  handleUpdateBranding,
  handleUploadLogo,
} from '../logic/settings';
import { settingsState } from '../state/settings';
import { roundingRuleOptions, paperWidthOptions, fontFamilyOptions } from '../schemas/settings';

export function SettingsPage() {
  const { settings, refetch: refetchSettings } = createSettingsResource();
  const { refetch: refetchStaff } = createStaffResource();
  const [toast, setToast] = createSignal<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [logoUploading, setLogoUploading] = createSignal(false);

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleGeneralSubmit(e: Event) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const input = {
      store_name: formData.get('store_name') as string,
      address: (formData.get('address') as string) || undefined,
      phone: (formData.get('phone') as string) || undefined,
      tax_percent: parseFloat(formData.get('tax_percent') as string) || 0,
      service_percent: parseFloat(formData.get('service_percent') as string) || 0,
      rounding_rule: formData.get('rounding_rule') as 'none' | 'up_100' | 'nearest_100',
      receipt_header: (formData.get('receipt_header') as string) || undefined,
      receipt_footer: (formData.get('receipt_footer') as string) || undefined,
      paper_width_mm: parseInt(formData.get('paper_width_mm') as string) || 58,
      require_payment_verification: formData.get('require_payment_verification') === 'on',
      operating_hours_start: (formData.get('operating_hours_start') as string) || undefined,
      operating_hours_end: (formData.get('operating_hours_end') as string) || undefined,
    };
    const result = await handleUpdateSettings(input);
    if (result.success) {
      showToast('success', strings.settings.saved);
      setGeneralDialogOpen(false);
    } else {
      showToast('error', result.message);
    }
  }

  async function handleBrandingSubmit(e: Event) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const input = {
      primary_color: formData.get('primary_color') as string,
      accent_color: formData.get('accent_color') as string,
      font_family: formData.get('font_family') as
        'Inter' | 'Poppins' | 'Plus Jakarta Sans' | 'system-ui',
      logo_path: settingsState.settings?.logo_path ?? undefined,
    };
    const result = await handleUpdateBranding(input);
    if (result.success) {
      applyColorTokens({ primary: input.primary_color, accent: input.accent_color });
      showToast('success', strings.settings.saved);
      setBrandingDialogOpen(false);
    } else {
      showToast('error', result.message);
    }
  }

  async function handleLogoUpload(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('error', strings.settings.invalidImage);
      return;
    }
    if (file.size > 1024 * 1024) {
      showToast('error', strings.settings.imageTooLarge);
      return;
    }
    setLogoUploading(true);
    const result = await handleUploadLogo(file);
    if (result.success) {
      setLogoPreview(result.url);
      showToast('success', strings.settings.logoUploaded);
    } else {
      showToast('error', result.message);
    }
    setLogoUploading(false);
  }

  const currentSettings = settings();

  return (
    <div class="page-container">
      <header class="page-header">
        <div>
          <h1 class="page-title">{strings.settings.title}</h1>
          <p class="page-subtitle">{strings.settings.subtitle}</p>
        </div>
      </header>

      <Tabs value="general" class="settings-tabs">
        <TabList aria-label="Pengaturan">
          <Tab value="general">{strings.settings.general}</Tab>
          <Tab value="branding">{strings.settings.branding}</Tab>
          <Tab value="staff">{strings.settings.staff}</Tab>
          <Tab value="printer">{strings.settings.printer}</Tab>
        </TabList>

        <TabPanel value="general">
          <div class="settings-grid">
            <Card class="settings-card">
              <header class="card-header">
                <h2>
                  <Save size={20} aria-hidden="true" /> {strings.settings.general}
                </h2>
              </header>
              <form onSubmit={handleGeneralSubmit} class="settings-form">
                <div class="form-group">
                  <label>{strings.settings.storeName}</label>
                  <Input
                    name="store_name"
                    value={currentSettings?.store_name ?? ''}
                    required
                    placeholder="Nama toko"
                  />
                </div>
                <div class="form-group">
                  <label>{strings.settings.address}</label>
                  <Input
                    name="address"
                    value={currentSettings?.address ?? ''}
                    placeholder="Alamat toko"
                  />
                </div>
                <div class="form-group">
                  <label>{strings.settings.phone}</label>
                  <Input
                    name="phone"
                    value={currentSettings?.phone ?? ''}
                    placeholder="Nomor telepon"
                  />
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>{strings.settings.taxPercent}</label>
                    <CurrencyInput
                      name="tax_percent"
                      value={currentSettings?.tax_percent ?? 0}
                      step={0.01}
                      max={100}
                      suffix="%"
                    />
                  </div>
                  <div class="form-group">
                    <label>{strings.settings.servicePercent}</label>
                    <CurrencyInput
                      name="service_percent"
                      value={currentSettings?.service_percent ?? 0}
                      step={0.01}
                      max={100}
                      suffix="%"
                    />
                  </div>
                </div>
                <div class="form-group">
                  <label>{strings.settings.roundingRule}</label>
                  <Select
                    name="rounding_rule"
                    options={roundingRuleOptions}
                    value={currentSettings?.rounding_rule ?? 'none'}
                  />
                </div>
                <div class="form-group">
                  <label>{strings.settings.receiptHeader}</label>
                  <Input
                    name="receipt_header"
                    value={currentSettings?.receipt_header ?? ''}
                    placeholder="Header struk (opsional)"
                  />
                </div>
                <div class="form-group">
                  <label>{strings.settings.receiptFooter}</label>
                  <Input
                    name="receipt_footer"
                    value={currentSettings?.receipt_footer ?? ''}
                    placeholder="Footer struk (opsional)"
                  />
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>{strings.settings.paperWidth}</label>
                    <Select
                      name="paper_width_mm"
                      options={paperWidthOptions}
                      value={currentSettings?.paper_width_mm ?? 58}
                    />
                  </div>
                </div>
                <div class="form-group">
                  <label class="switch-label">
                    <Switch
                      name="require_payment_verification"
                      checked={currentSettings?.require_payment_verification ?? true}
                    />
                    <span>{strings.settings.requireVerification}</span>
                  </label>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>{strings.settings.openTime}</label>
                    <Input
                      name="operating_hours_start"
                      type="time"
                      value={currentSettings?.operating_hours_start ?? ''}
                    />
                  </div>
                  <div class="form-group">
                    <label>{strings.settings.closeTime}</label>
                    <Input
                      name="operating_hours_end"
                      type="time"
                      value={currentSettings?.operating_hours_end ?? ''}
                    />
                  </div>
                </div>
                <div class="form-actions">
                  <Button type="submit" variant="primary">
                    <Save size={18} aria-hidden="true" />
                    {strings.common.save}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </TabPanel>

        <TabPanel value="branding">
          <div class="settings-grid">
            <Card class="settings-card branding-card">
              <header class="card-header">
                <h2>
                  <Palette size={20} aria-hidden="true" /> {strings.settings.branding}
                </h2>
              </header>
              <form onSubmit={handleBrandingSubmit} class="settings-form">
                <div class="branding-preview">
                  <div
                    class="preview-header"
                    style={{ 'background-color': currentSettings?.primary_color }}
                  >
                    <div
                      class="preview-logo"
                      style={{
                        'background-image': currentSettings?.logo_path
                          ? `url(${currentSettings.logo_path})`
                          : 'none',
                      }}
                    />
                    <div class="preview-info">
                      <h3>{currentSettings?.store_name ?? strings.appName}</h3>
                      <p>{currentSettings?.address ?? ''}</p>
                    </div>
                  </div>
                  <div class="preview-buttons">
                    <Button variant="secondary" class="preview-btn">
                      {strings.pos.dineIn}
                    </Button>
                    <Button variant="primary" class="preview-btn">
                      {strings.pos.takeaway}
                    </Button>
                  </div>
                </div>

                <div class="form-group">
                  <label>{strings.settings.primaryColor}</label>
                  <div class="color-input-group">
                    <input
                      type="color"
                      name="primary_color"
                      value={currentSettings?.primary_color ?? '#6F4E37'}
                      onChange={(e) => {
                        const input = e.target as HTMLInputElement;
                        (e.target as HTMLInputElement).form?.requestSubmit?.();
                        const form = input.form as HTMLFormElement;
                        const accentInput = form.querySelector(
                          '[name="accent_color"]'
                        ) as HTMLInputElement;
                        const ratio = getContrastRatio(input.value, accentInput.value);
                        if (ratio < 4.5) {
                          input.style.borderColor = 'var(--color-danger)';
                        } else {
                          input.style.borderColor = '';
                        }
                      }}
                    />
                    <Input
                      name="primary_color"
                      type="text"
                      value={currentSettings?.primary_color ?? '#6F4E37'}
                      placeholder="#RRGGBB"
                      class="color-hex"
                    />
                  </div>
                  <ContrastCheck
                    color1={currentSettings?.primary_color}
                    color2={currentSettings?.accent_color}
                    textColor="white"
                  />
                </div>

                <div class="form-group">
                  <label>{strings.settings.accentColor}</label>
                  <div class="color-input-group">
                    <input
                      type="color"
                      name="accent_color"
                      value={currentSettings?.accent_color ?? '#F5E6D3'}
                      onChange={(e) => {
                        const input = e.target as HTMLInputElement;
                        const form = input.form as HTMLFormElement;
                        const primaryInput = form.querySelector(
                          '[name="primary_color"]'
                        ) as HTMLInputElement;
                        const ratio = getContrastRatio(primaryInput.value, input.value);
                        if (ratio < 4.5) {
                          input.style.borderColor = 'var(--color-danger)';
                        } else {
                          input.style.borderColor = '';
                        }
                      }}
                    />
                    <Input
                      name="accent_color"
                      type="text"
                      value={currentSettings?.accent_color ?? '#F5E6D3'}
                      placeholder="#RRGGBB"
                      class="color-hex"
                    />
                  </div>
                  <ContrastCheck
                    color1={currentSettings?.primary_color}
                    color2={currentSettings?.accent_color}
                    textColor="black"
                  />
                </div>

                <div class="form-group">
                  <label>{strings.settings.fontFamily}</label>
                  <Select
                    name="font_family"
                    options={fontFamilyOptions}
                    value={currentSettings?.font_family ?? 'Inter'}
                  />
                </div>

                <div class="form-group">
                  <label>{strings.settings.logo}</label>
                  <div class="logo-upload">
                    <Show when={currentSettings?.logo_path}>
                      <img src={currentSettings!.logo_path!} alt="Logo" class="logo-preview" />
                    </Show>
                    <label class="upload-label">
                      <Upload size={20} aria-hidden="true" />
                      <span>{strings.settings.uploadLogo}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        hidden
                        disabled={logoUploading()}
                      />
                    </label>
                  </div>
                </div>

                <div class="form-actions">
                  <Button type="submit" variant="primary" disabled={logoUploading()}>
                    <Save size={18} aria-hidden="true" />
                    {strings.common.save}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </TabPanel>

        <TabPanel value="staff">
          <StaffTab refetchStaff={refetchStaff} refetchSettings={refetchSettings} />
        </TabPanel>

        <TabPanel value="printer">
          <PrinterSettingsTab />
        </TabPanel>
      </Tabs>

      <Show when={toast()}>
        <Toast type={toast()!.type} message={toast()!.message} onClose={() => setToast(null)} />
      </Show>
    </div>
  );
}

function ContrastCheck(props: { color1: string; color2: string; textColor: string }) {
  // eslint-disable-next-line solid/reactivity -- props accessed in render scope
  const ratio = getContrastRatio(props.color1, props.color2);
  const passed = ratio >= 4.5;
  return (
    <div
      class="contrast-check"
      style={{ color: passed ? 'var(--color-success)' : 'var(--color-danger)' }}
    >
      <span>
        {passed ? (
          <Check size={14} aria-hidden="true" />
        ) : (
          <AlertTriangle size={14} aria-hidden="true" />
        )}
      </span>
      <span>
        Rasio kontras: {ratio.toFixed(2)}:1 {passed ? '(Lulus WCAG AA)' : '(Gagal - minimal 4.5:1)'}
      </span>
    </div>
  );
}

function StaffTab() {
  const { staff } = createStaffResource();

  return (
    <div class="staff-tab">
      <Card>
        <header class="card-header">
          <h2>
            <Font size={20} aria-hidden="true" /> {strings.settings.staff}
          </h2>
          <Button onClick={openCreateStaff}>
            <span>+</span> {strings.settings.addStaff}
          </Button>
        </header>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th scope="col">{strings.settings.colName}</th>
                <th scope="col">{strings.settings.colEmail}</th>
                <th scope="col">{strings.settings.colRole}</th>
                <th scope="col">{strings.settings.colStatus}</th>
                <th scope="col">{strings.settings.colCreated}</th>
                <th scope="col">&nbsp;</th>
              </tr>
            </thead>
            <tbody>
              <For each={staff()}>
                {(s) => (
                  <tr>
                    <td>{s.full_name}</td>
                    <td>{s.email}</td>
                    <td>
                      <Badge variant={s.role === 'super_admin' ? 'warning' : 'info'}>
                        {s.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                      </Badge>
                    </td>
                    <td>
                      <Switch
                        checked={s.is_active}
                        onChange={() => {
                          /* handleToggleStaffActive(s.id, checked) */
                        }}
                        disabled={s.id === settingsState.profile?.id}
                      />
                    </td>
                    <td>{new Date(s.created_at).toLocaleDateString('id-ID')}</td>
                    <td>
                      <Toolbar gap={2}>
                        <IconButton
                          aria-label="Edit"
                          variant="ghost"
                          onClick={() => {
                            /* open edit */
                          }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </IconButton>
                      </Toolbar>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function PrinterSettingsTab() {
  return (
    <div class="printer-tab">
      <Card>
        <header class="card-header">
          <h2>
            <Font size={20} aria-hidden="true" /> {strings.settings.printer}
          </h2>
        </header>
        <div class="printer-status">
          <p>{strings.settings.printerNotConfigured}</p>
          <Button variant="secondary">{strings.settings.connectPrinter}</Button>
          <Button variant="ghost">{strings.settings.testPrint}</Button>
        </div>
      </Card>
    </div>
  );
}

function Tabs(props: {
  value: string;
  onChange: (v: string) => void;
  class?: string;
  children: JSX.Element;
}) {
  return <div class={`tabs ${props.class ?? ''}`}>{props.children}</div>;
}

function TabList(props: { children: JSX.Element }) {
  return (
    <div class="tab-list" role="tablist">
      {props.children}
    </div>
  );
}

function Tab(props: { value: string; children: JSX.Element }) {
  return (
    <button role="tab" class="tab" data-value={props.value}>
      {props.children}
    </button>
  );
}

function TabPanel(props: { value: string; children: JSX.Element }) {
  return (
    <div role="tabpanel" class="tab-panel" data-value={props.value}>
      {props.children}
    </div>
  );
}
