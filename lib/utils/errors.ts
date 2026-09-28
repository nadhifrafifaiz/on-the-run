// Typed errors thrown by services. Server actions catch these and convert to
// the client-facing `{ data, error, message }` shape.

export type ServiceErrorCode =
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "OUT_OF_RANGE"
  | "CONSTRAINT"
  | "CONFLICT"
  | "VALIDATION";

export class ServiceError extends Error {
  readonly code: ServiceErrorCode;
  readonly details?: unknown;
  constructor(code: ServiceErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "ServiceError";
    this.code = code;
    this.details = details;
  }
}

export function isServiceError(e: unknown): e is ServiceError {
  return e instanceof ServiceError;
}
