import type { AppError } from '@/data/errors';

/** Every query/mutation error is a typed AppError (hooks wrap repository calls with toAppError). */
declare module '@tanstack/react-query' {
  interface Register {
    defaultError: AppError;
  }
}
