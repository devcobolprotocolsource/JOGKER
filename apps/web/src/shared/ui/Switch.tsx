export function Switch(props: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  name?: string;
}) {
  return (
    <label class="switch-control">
      <input
        type="checkbox"
        role="switch"
        name={props.name}
        checked={props.checked}
        disabled={props.disabled}
        onChange={(event) => props.onChange(event.currentTarget.checked)}
      />
      <span class="switch-control__track" aria-hidden="true">
        <span />
      </span>
      <span>{props.label}</span>
    </label>
  );
}
