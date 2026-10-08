import { render } from 'solid-js/web';
import { App } from './app/App';
import './styles.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Elemen root tidak ditemukan.');
}

render(() => <App />, root);
