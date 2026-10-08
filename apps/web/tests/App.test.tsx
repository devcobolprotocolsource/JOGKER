import { render, screen, waitFor } from '@solidjs/testing-library';
import { describe, expect, it } from 'vitest';
import { App } from '../src/app/App';
import { loginSchema } from '../src/features/auth/schemas/login';

describe('App', () => {
  it('redirects unauthenticated visitors to the login screen', async () => {
    render(() => <App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Masuk ke JOKGER' })).toBeInTheDocument();
    });
  });
});

describe('loginSchema', () => {
  it('accepts valid credentials and enforces password length', () => {
    expect(
      loginSchema.safeParse({
        email: 'staff@example.com',
        password: 'coffee-pass-20',
      }).success
    ).toBe(true);
    expect(loginSchema.safeParse({ email: 'not-an-email', password: 'short' }).success).toBe(false);
  });
});
