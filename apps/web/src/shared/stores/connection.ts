import { createSignal } from 'solid-js';

const [online, setOnline] = createSignal(typeof navigator === 'undefined' || navigator.onLine);

export function initializeConnection(): () => void {
  const markOnline = () => setOnline(true);
  const markOffline = () => setOnline(false);
  window.addEventListener('online', markOnline);
  window.addEventListener('offline', markOffline);
  return () => {
    window.removeEventListener('online', markOnline);
    window.removeEventListener('offline', markOffline);
  };
}

export { online };
