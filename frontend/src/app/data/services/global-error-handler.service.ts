import { ErrorHandler, Injectable } from '@angular/core';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    const err = error instanceof Error ? error : new Error(String(error));

    console.error(`[GameGalaxy Error] ${err.message}`, err);
  }
}
