import { onMount, onCleanup } from 'solid-js';
import { Routes } from './routes';
import { initializeSession } from '../shared/stores/session';
import { initializeConnection } from '../shared/stores/connection';
import { initializeTheme } from '../shared/theme/theme';

export function App() {
  let disposeConnection: (() => void) | undefined;
  onMount(() => {
    initializeTheme();
    disposeConnection = initializeConnection();
    void initializeSession();
  });
  onCleanup(() => disposeConnection?.());

  return <Routes />;
}
