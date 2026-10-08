import { A } from '@solidjs/router';
import { ShieldX } from 'lucide-solid';
import { strings } from '../../../shared/strings';

export function ForbiddenPage() {
  return (
    <main class="forbidden-page">
      <ShieldX size={36} aria-hidden="true" />
      <h1>{strings.authorization.forbiddenTitle}</h1>
      <p>{strings.authorization.forbiddenDescription}</p>
      <A class="button button--primary" href="/pos">
        {strings.authorization.backToPos}
      </A>
    </main>
  );
}
