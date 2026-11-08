/** JSON values accepted from the external scientific worker. */
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

/** Fixed execution binding; none of these fields are model-owned arguments. */
export interface Connection {
  python: string;
  projectRoot: string;
  runtimeRoot: string;
  workRoot: string;
  hydromodelConfig?: string;
  dataConfig?: string;
  torchhydroConfig?: string;
  configurationRoot?: string;
}

export interface WorkerFailure {
  code: string;
  message: string;
  retryable: boolean;
  details?: Json;
}
export type WorkerResponse = { ok: true; value: Json } | { ok: false; error: WorkerFailure };

/** Recognize a parsed external object without trusting its fields. */
export function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function jsonValue(value: unknown): value is Json {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(jsonValue);
  return record(value) && Object.values(value).every(jsonValue);
}

/** Validate model-supplied JSON before forwarding it to the Python process. */
export function jsonObject(value: unknown): value is { [key: string]: Json } {
  return record(value) && Object.values(value).every(jsonValue);
}

/** Reject malformed wire replies instead of treating them as an empty success. */
export function parseResponse(text: string): WorkerResponse {
  const value: unknown = JSON.parse(text);
  if (record(value) && value.ok === true && jsonValue(value.value)) return { ok: true, value: value.value };
  if (record(value) && value.ok === false && record(value.error)) {
    const error = value.error;
    if (typeof error.code === 'string' && typeof error.message === 'string' && typeof error.retryable === 'boolean'
      && (error.details === undefined || jsonValue(error.details))) {
      return { ok: false, error: { code: error.code, message: error.message, retryable: error.retryable,
        ...(error.details === undefined ? {} : { details: error.details }) } };
    }
  }
  throw new Error('WORKER_PROTOCOL_ERROR: expected a structured hydrosystem result.');
}
