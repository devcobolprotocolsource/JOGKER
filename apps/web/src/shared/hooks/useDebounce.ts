import { createSignal, onCleanup, onMount } from 'solid-js';

export function useDebounce<T>(source: () => T, delay: number): () => T {
  const [debouncedValue, setDebouncedValue] = createSignal<T>(source());

  onMount(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const update = () => {
      timeout = setTimeout(() => {
        setDebouncedValue(source());
      }, delay);
    };
    update();
    onCleanup(() => clearTimeout(timeout));
  });

  return debouncedValue;
}
