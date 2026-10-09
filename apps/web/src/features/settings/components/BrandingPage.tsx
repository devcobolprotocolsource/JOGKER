import { Show, createSignal } from 'solid-js';
import { Save, Upload, Check, AlertTriangle } from 'lucide-solid';
import { Button, Card, Input, Toast } from '../../../shared/ui';
import { strings } from '../../../shared/strings';
import { applyColorTokens, getContrastRatio } from '../../../shared/theme/theme';
import { handleUpdateBranding, handleUploadLogo } from '../logic/settings';
import { getSettingsState } from '../state/settings';

export function BrandingPage() {
  const [toast, setToast] = createSignal<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [logoUploading, setLogoUploading] = createSignal(false);

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleBrandingSubmit(e: Event) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const input = {
      primary_color: formData.get('primary_color') as string,
      accent_color: formData.get('accent_color') as string,
      font_family: 'Inter' as const,
      logo_path: getSettingsState().settings?.logo_path ?? undefined,
    };
    const result = await handleUpdateBranding(input);
    if (result.success) {
      applyColorTokens({ primary: input.primary_color, accent: input.accent_color });
      showToast('success', strings.settings.saved);
    } else {
      showToast('error', result.message ?? 'Gagal menyimpan');
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
      showToast('success', strings.settings.logoUploaded);
    } else {
      showToast('error', result.message ?? 'Gagal mengunggah logo');
    }
    setLogoUploading(false);
  }

  const currentSettings = getSettingsState().settings;

  return (
    <div class="page-container">
      <header class="page-header">
        <div>
          <h1 class="page-title">{strings.settings.branding}</h1>
          <p class="page-subtitle">{strings.settings.brandingSubtitle}</p>
        </div>
      </header>

      <Card class="branding-page-card">
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
                  const form = input.form as HTMLFormElement;
                  const accentInput = form.querySelector(
                    '[name="accent_color"]'
                  ) as HTMLInputElement;
                  const ratio = getContrastRatio(input.value, accentInput.value);
                  input.style.borderColor = ratio < 4.5 ? 'var(--color-danger)' : '';
                }}
              />
              <Input
                label={strings.settings.primaryColor}
                name="primary_color"
                type="text"
                value={currentSettings?.primary_color ?? '#6F4E37'}
                placeholder="#RRGGBB"
                class="color-hex"
              />
            </div>
            <ContrastCheck
              color1={currentSettings?.primary_color ?? '#6F4E37'}
              color2={currentSettings?.accent_color ?? '#F5E6D3'}
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
                  input.style.borderColor = ratio < 4.5 ? 'var(--color-danger)' : '';
                }}
              />
              <Input
                label={strings.settings.accentColor}
                name="accent_color"
                type="text"
                value={currentSettings?.accent_color ?? '#F5E6D3'}
                placeholder="#RRGGBB"
                class="color-hex"
              />
            </div>
            <ContrastCheck
              color1={currentSettings?.primary_color ?? '#6F4E37'}
              color2={currentSettings?.accent_color ?? '#F5E6D3'}
              textColor="black"
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

function ContrastCheck(props: { color1: string; color2: string; textColor: string }) {
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
