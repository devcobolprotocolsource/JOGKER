import { mapAppError, type AppError } from '../lib/app-error';

export type Result<T> = { ok: true; data: T } | { ok: false; error: AppError };

export async function capture<T>(
  operation: () => Promise<T>,
): Promise<Result<T>> {
  try {
    return { ok: true, data: await operation() };
  } catch (error) {
    return { ok: false, error: mapAppError(error) };
  }
}
