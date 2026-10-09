import { createEffect, Show, createSignal } from 'solid-js';
import { Save, Palette, Upload, Check, AlertTriangle } from 'lucide-solid';
import { Button, Card, Input, Select, Switch, Toast, Tabs } from '../../../shared/ui';
import { strings } from '../../../shared/strings';
import { applyColorTokens, getContrastRatio } from '../../../shared/theme/theme';
import {
  createSettingsResource,
  handleUpdateSettings,
  handleUpdateBranding,
  handleUploadLogo,
} from '../logic/settings';
import { getSettingsState } from '../state/settings';
import { roundingRuleOptions, paperWidthOptions } from '../schemas/settings';
import type { SettingsInput } from '../schemas/settings';
import { StaffPage } from './StaffPage';

export function SettingsPage() {
  const { settings } = createSettingsResource();
  const settingsState = getSettingsState();
  const [activeTab, setActiveTab] = createSignal('general');
  const [toast, setToast] = createSignal<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [logoUploading, setLogoUploading] = createSignal(false);
  const [logoPreview, setLogoPreview] = createSignal<string | null>(null);
  const [requireVerification, setRequireVerification] = createSignal(true);

  createEffect(() => {
    const savedSettings = settings();
    if (savedSettings) setRequireVerification(savedSettings.require_payment_verification);
  });

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleGeneralSubmit(e: Event) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const input: SettingsInput = {
      store_name: formData.get('store_name') as string,
      address: (formData.get('address') as string) || undefined,
      phone: (formData.get('phone') as string) || undefined,
      tax_percent: parseFloat(formData.get('tax_percent') as string) || 0,
      service_percent: parseFloat(formData.get('service_percent') as string) || 0,
      rounding_rule: formData.get('rounding_rule') as 'none' | 'up_100' | 'nearest_100',
      receipt_header: (formData.get('receipt_header') as string) || undefined,
      receipt_footer: (formData.get('receipt_footer') as string) || undefined,
      paper_width_mm: formData.get('paper_width_mm') === '80' ? 80 : 58,
      require_payment_verification: formData.get('require_payment_verification') === 'on',
      operating_hours_start: (formData.get('operating_hours_start') as string) || undefined,
      operating_hours_end: (formData.get('operating_hours_end') as string) || undefined,
    };
    const result = await handleUpdateSettings(input);
    if (result.success) {
      showToast('success', strings.settings.saved);
    } else {
      showToast('error', result.message ?? 'Gagal menyimpan pengaturan');
    }
  }

  async function handleBrandingSubmit(e: Event) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const input = {
      primary_color: formData.get('primary_color') as string,
      accent_color: formData.get('accent_color') as string,
      font_family: 'Inter' as const,
      logo_path: settingsState.settings?.logo_path ?? undefined,
    };
    const result = await handleUpdateBranding(input);
    if (result.success) {
      applyColorTokens({ primary: input.primary_color, accent: input.accent_color });
      showToast('success', strings.settings.saved);
    } else {
      showToast('error', result.message ?? 'Gagal menyimpan branding');
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
      setLogoPreview(result.url ?? null);
      showToast('success', strings.settings.logoUploaded);
    } else {
      showToast('error', result.message ?? 'Gagal mengunggah logo');
    }
    setLogoUploading(false);
  }

  const currentSettings = settings;

  return (
    <div class="page-container">
      <header class="page-header">
        <div>
          <h1 class="page-title">{strings.settings.title}</h1>
          <p class="page-subtitle">{strings.settings.subtitle}</p>
        </div>
      </header>

      <Tabs
        label="Pengaturan"
        value={activeTab()}
        onChange={setActiveTab}
        tabs={[
          { value: 'general', label: strings.settings.general },
          { value: 'branding', label: strings.settings.branding },
          { value: 'staff', label: strings.settings.staff },
          { value: 'printer', label: strings.settings.printer },
        ]}
      />

      <Show when={activeTab() === 'general'}>
        <div class="settings-grid">
          <Card class="settings-card">
            <header class="card-header">
              <h2>
                <Save size={20} aria-hidden="true" /> {strings.settings.general}
              </h2>
            </header>
            <form
              onSubmit={(event) => {
                void handleGeneralSubmit(event);
              }}
              class="settings-form"
            >
              <div class="form-group">
                <Input
                  name="store_name"
                  label={strings.settings.storeName}
                  value={currentSettings()?.store_name ?? ''}
                  required
                  placeholder="Nama toko"
                />
              </div>
              <div class="form-group">
                <Input
                  name="address"
                  label={strings.settings.address}
                  value={currentSettings()?.address ?? ''}
                  placeholder="Alamat toko"
                />
              </div>
              <div class="form-group">
                <Input
                  name="phone"
                  label={strings.settings.phone}
                  value={currentSettings()?.phone ?? ''}
                  placeholder="Nomor telepon"
                />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <Input
                    name="tax_percent"
                    label={strings.settings.taxPercent}
                    type="number"
                    value={currentSettings()?.tax_percent ?? 0}
                    step="0.01"
                    max={100}
                  />
                </div>
                <div class="form-group">
                  <Input
                    name="service_percent"
                    label={strings.settings.servicePercent}
                    type="number"
                    value={currentSettings()?.service_percent ?? 0}
                    step="0.01"
                    max={100}
                  />
                </div>
              </div>
              <div class="form-group">
                <Select
                  name="rounding_rule"
                  label={strings.settings.roundingRule}
                  options={[...roundingRuleOptions]}
                  value={currentSettings()?.rounding_rule ?? 'none'}
                />
              </div>
              <div class="form-group">
                <Input
                  name="receipt_header"
                  label={strings.settings.receiptHeader}
                  value={currentSettings()?.receipt_header ?? ''}
                  placeholder="Header struk (opsional)"
                />
              </div>
              <div class="form-group">
                <Input
                  name="receipt_footer"
                  label={strings.settings.receiptFooter}
                  value={currentSettings()?.receipt_footer ?? ''}
                  placeholder="Footer struk (opsional)"
                />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <Select
                    name="paper_width_mm"
                    label={strings.settings.paperWidth}
                    options={[...paperWidthOptions]}
                    value={String(currentSettings()?.paper_width_mm ?? 58)}
                  />
                </div>
              </div>
              <div class="form-group">
                <div class="switch-label">
                  <Switch
                    name="require_payment_verification"
                    label={strings.settings.requireVerification}
                    checked={requireVerification()}
                    onChange={setRequireVerification}
                  />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <Input
                    name="operating_hours_start"
                    label={strings.settings.openTime}
                    type="time"
                    value={currentSettings()?.operating_hours_start ?? ''}
                  />
                </div>
                <div class="form-group">
                  <Input
                    name="operating_hours_end"
                    label={strings.settings.closeTime}
                    type="time"
                    value={currentSettings()?.operating_hours_end ?? ''}
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
      </Show>

      <Show when={activeTab() === 'branding'}>
        <div class="settings-grid">
          <Card class="settings-card branding-card">
            <header class="card-header">
              <h2>
                <Palette size={20} aria-hidden="true" /> {strings.settings.branding}
              </h2>
            </header>
            <form
              onSubmit={(event) => {
                void handleBrandingSubmit(event);
              }}
              class="settings-form"
            >
              <div class="branding-preview">
                <div
                  class="preview-header"
                  style={{ 'background-color': currentSettings()?.primary_color }}
                >
                  <div
                    class="preview-logo"
                    style={{
                      'background-image': currentSettings()?.logo_path
                        ? `url(${currentSettings()!.logo_path})`
                        : 'none',
                    }}
                  />
                  <div class="preview-info">
                    <h3>{currentSettings()?.store_name ?? strings.appName}</h3>
                    <p>{currentSettings()?.address ?? ''}</p>
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
                <div class="color-input-group">
                  <input
                    type="color"
                    name="primary_color"
                    aria-label={strings.settings.primaryColor}
                    value={currentSettings()?.primary_color ?? '#6F4E37'}
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
                    label={strings.settings.primaryColor}
                    type="text"
                    value={currentSettings()?.primary_color ?? '#6F4E37'}
                    placeholder="#RRGGBB"
                    class="color-hex"
                  />
                </div>
                <ContrastCheck
                  color1={currentSettings()?.primary_color ?? '#6F4E37'}
                  color2={currentSettings()?.accent_color ?? '#F5E6D3'}
                  textColor="white"
                />
              </div>

              <div class="form-group">
                <div class="color-input-group">
                  <input
                    type="color"
                    name="accent_color"
                    aria-label={strings.settings.accentColor}
                    value={currentSettings()?.accent_color ?? '#F5E6D3'}
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
                    label={strings.settings.accentColor}
                    type="text"
                    value={currentSettings()?.accent_color ?? '#F5E6D3'}
                    placeholder="#RRGGBB"
                    class="color-hex"
                  />
                </div>
                <ContrastCheck
                  color1={currentSettings()?.primary_color ?? '#6F4E37'}
                  color2={currentSettings()?.accent_color ?? '#F5E6D3'}
                  textColor="black"
                />
              </div>

              <div class="form-group">
                <label>{strings.settings.logo}</label>
                <div class="logo-upload">
                  <Show when={logoPreview() ?? currentSettings()?.logo_path}>
                    <img
                      src={logoPreview() ?? currentSettings()?.logo_path ?? ''}
                      alt="Logo"
                      class="logo-preview"
                    />
                  </Show>
                  <label class="upload-label">
                    <Upload size={20} aria-hidden="true" />
                    <span>{strings.settings.uploadLogo}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        void handleLogoUpload(event);
                      }}
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
      </Show>

      <Show when={activeTab() === 'staff'}>
        <StaffPage />
      </Show>

      <Show when={activeTab() === 'printer'}>
        <PrinterSettingsTab />
      </Show>

      <Show when={toast()}>
        <Toast
          open={true}
          title={toast()!.type === 'success' ? 'Berhasil' : 'Error'}
          variant={toast()!.type}
          message={toast()!.message}
          onClose={() => setToast(null)}
        />
      </Show>
    </div>
  );
}

function ContrastCheck(props: { color1: string; color2: string; textColor: string }) {
  // eslint-disable-next-line solid/reactivity -- props accessed in render scope
  const ratio = () => getContrastRatio(props.color1, props.color2);
  const passed = () => ratio() >= 4.5;
  return (
    <div
      class="contrast-check"
      style={{ color: passed() ? 'var(--color-success)' : 'var(--color-danger)' }}
    >
      <span>
        <Show when={passed()} fallback={<AlertTriangle size={14} aria-hidden="true" />}>
          <Check size={14} aria-hidden="true" />
        </Show>
      </span>
      <span>
        Rasio kontras: {ratio().toFixed(2)}:1{' '}
        {passed() ? '(Lulus WCAG AA)' : '(Gagal - minimal 4.5:1)'}
      </span>
    </div>
  );
}

function PrinterSettingsTab() {
  return (
    <div class="printer-tab">
      <Card>
        <header class="card-header">
          <h2>
            <Palette size={20} aria-hidden="true" /> {strings.settings.printer}
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
