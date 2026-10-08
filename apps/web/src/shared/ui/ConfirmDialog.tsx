import { createSignal, Show } from 'solid-js';
import { Modal } from './Modal';
import { Textarea } from './Textarea';
import { Button } from './Button';
import { strings } from '../strings';

export function ConfirmDialog(props: {
  open: boolean;
  title: string;
  description: string;
  destructive?: boolean;
  requireReason?: boolean;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = createSignal('');
  const invalid = () => Boolean(props.requireReason && !reason().trim());
  return (
    <Modal
      open={props.open}
      title={props.title}
      onClose={props.onClose}
      closeOnEscape={!props.destructive}
      closeOnBackdrop={!props.destructive}
      size="sm"
    >
      <p>{props.description}</p>
      <Show when={props.requireReason}>
        <Textarea
          label={strings.sharedUi.reason}
          value={reason()}
          maxLength={500}
          onInput={(event) => setReason(event.currentTarget.value)}
        />
      </Show>
      <div class="dialog-actions">
        <Button variant="secondary" onClick={props.onClose}>
          {props.cancelLabel}
        </Button>
        <Button
          variant={props.destructive ? 'danger' : 'primary'}
          disabled={invalid()}
          onClick={() => props.onConfirm(reason().trim())}
        >
          {props.confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
