import { describe, expect, it } from 'vitest';

import { getApiErrorMessage, getApiErrorMessageAsync } from '../apiError';

const FALLBACK = 'No se pudo completar la acción.';

describe('getApiErrorMessage', () => {
  it('returns the fallback for a non-API error', () => {
    expect(getApiErrorMessage(new Error('boom'), FALLBACK)).toBe(FALLBACK);
    expect(getApiErrorMessage('just a string', FALLBACK)).toBe(FALLBACK);
    expect(getApiErrorMessage(null, FALLBACK)).toBe(FALLBACK);
  });

  it('extracts a bare-list DRF error (ValidationError(detail=str(exc)))', () => {
    const err = { response: { status: 400, data: ['Ya existe un miembro con este correo.'] } };
    expect(getApiErrorMessage(err, FALLBACK)).toBe('Ya existe un miembro con este correo.');
  });

  it('extracts a {"detail": "..."} error', () => {
    const err = { response: { status: 403, data: { detail: 'Solo el rol admin puede realizar esta acción.' } } };
    expect(getApiErrorMessage(err, FALLBACK)).toBe('Solo el rol admin puede realizar esta acción.');
  });

  it('extracts the first field error from a per-field serializer error', () => {
    const err = { response: { status: 400, data: { email: ['Este campo es requerido.'] } } };
    expect(getApiErrorMessage(err, FALLBACK)).toBe('Este campo es requerido.');
  });

  it('extracts a plain-string field value (e.g. {"token": "Invitación no válida."})', () => {
    const err = { response: { status: 400, data: { token: 'Invitación no válida.' } } };
    expect(getApiErrorMessage(err, FALLBACK)).toBe('Invitación no válida.');
  });

  it('falls back to the fallback when the body has nothing usable', () => {
    const err = { response: { status: 400, data: {} } };
    expect(getApiErrorMessage(err, FALLBACK)).toBe(FALLBACK);
  });

  it('returns a distinct message for a network failure (no response)', () => {
    const err = { isAxiosError: true, message: 'Network Error' };
    expect(getApiErrorMessage(err, FALLBACK)).toMatch(/conectar/i);
  });

  it('returns a distinct message for a timeout', () => {
    const err = { isAxiosError: true, code: 'ECONNABORTED' };
    expect(getApiErrorMessage(err, FALLBACK)).toMatch(/tardó/i);
  });

  it('returns a distinct message for a 5xx, never the raw body', () => {
    const err = { response: { status: 500, data: '<!doctype html><html>Server Error</html>' } };
    expect(getApiErrorMessage(err, FALLBACK)).toMatch(/servidor/i);
  });

  it('never surfaces an HTML error page as the message', () => {
    const err = { response: { status: 400, data: '<!doctype html><html>oops</html>' } };
    expect(getApiErrorMessage(err, FALLBACK)).toBe(FALLBACK);
  });

  it('falls back for an axios-shaped error with no response and no isAxiosError marker', () => {
    // Mirrors how tests in this codebase mock errors as plain objects.
    const err = { response: { data: { detail: 'Credenciales inválidas.' } } };
    expect(getApiErrorMessage(err, FALLBACK)).toBe('Credenciales inválidas.');
  });
});

describe('getApiErrorMessageAsync', () => {
  it('parses a JSON blob error body (file download failures)', async () => {
    const blob = new Blob([JSON.stringify(['El rango de fechas es inválido.'])], { type: 'application/json' });
    const err = { response: { status: 400, data: blob } };
    await expect(getApiErrorMessageAsync(err, FALLBACK)).resolves.toBe('El rango de fechas es inválido.');
  });

  it('falls back for a non-JSON blob error body', async () => {
    const blob = new Blob(['not json'], { type: 'text/plain' });
    const err = { response: { status: 400, data: blob } };
    await expect(getApiErrorMessageAsync(err, FALLBACK)).resolves.toBe(FALLBACK);
  });

  it('returns the server-error message for a 5xx blob without parsing it', async () => {
    const blob = new Blob(['<html>fail</html>'], { type: 'text/html' });
    const err = { response: { status: 500, data: blob } };
    await expect(getApiErrorMessageAsync(err, FALLBACK)).resolves.toMatch(/servidor/i);
  });
});
