import { createMemo, For, Show } from 'solid-js';
import { strings } from '../strings';

type Preset = 'today' | 'yesterday' | '7days' | 'month';
const labels: Record<Preset, string> = {
  today: strings.sharedUi.presets.today,
  yesterday: strings.sharedUi.presets.yesterday,
  '7days': strings.sharedUi.presets.sevenDays,
  month: strings.sharedUi.presets.month,
};

function jakartaDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function shiftDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

export function DatePicker(props: {
  mode?: 'single' | 'range';
  value: string | [string, string];
  onChange: (value: string | [string, string]) => void;
  label: string;
}) {
  const range = () => props.mode === 'range';
  const from = () =>
    range() ? (props.value as [string, string])[0] : (props.value as string);
  const to = () => (range() ? (props.value as [string, string])[1] : '');
  const today = createMemo(() => jakartaDate(new Date()));
  function applyPreset(preset: Preset) {
    const current = new Date(`${today()}T12:00:00Z`);
    const start =
      preset === 'yesterday'
        ? shiftDays(current, -1)
        : preset === '7days'
          ? shiftDays(current, -6)
          : preset === 'month'
            ? new Date(
                Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), 1),
              )
            : current;
    const end = preset === 'yesterday' ? shiftDays(current, -1) : current;
    props.onChange(
      range() ? [jakartaDate(start), jakartaDate(end)] : jakartaDate(end),
    );
  }
  return (
    <fieldset class="date-picker">
      <legend class="field__label">{props.label}</legend>
      <div class="date-picker__inputs">
        <label>
          <span class="sr-only">{strings.sharedUi.dateFrom}</span>
          <input
            class="input"
            type="date"
            value={from()}
            onInput={(event) =>
              props.onChange(
                range()
                  ? [event.currentTarget.value, to()]
                  : event.currentTarget.value,
              )
            }
          />
        </label>
        <Show when={range()}>
          <label>
            <span class="sr-only">{strings.sharedUi.dateTo}</span>
            <input
              class="input"
              type="date"
              value={to()}
              onInput={(event) =>
                props.onChange([from(), event.currentTarget.value])
              }
            />
          </label>
        </Show>
      </div>
      <div class="date-picker__presets">
        <For each={Object.keys(labels) as Preset[]}>
          {(preset) => (
            <button
              class="text-button"
              type="button"
              onClick={() => applyPreset(preset)}
            >
              {labels[preset]}
            </button>
          )}
        </For>
      </div>
    </fieldset>
  );
}
