import { createSignal } from 'solid-js';

const [onlyLowStock, setOnlyLowStock] = createSignal(false);
const [searchTerm, setSearchTerm] = createSignal('');

export { onlyLowStock, searchTerm, setOnlyLowStock, setSearchTerm };
