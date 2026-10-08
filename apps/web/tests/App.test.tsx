import { render, screen } from '@solidjs/testing-library';
import { describe, expect, it } from 'vitest';
import { App } from '../src/app/App';

describe('App', () => {
  it('renders the application entry point', () => {
    render(() => <App />);

    expect(screen.getByRole('heading', { name: 'JOKGER' })).toBeInTheDocument();
  });
});
