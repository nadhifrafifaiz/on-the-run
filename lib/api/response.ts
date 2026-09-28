import { NextResponse } from "next/server";

export type ApiEnvelope<T> = {
  data: T | null;
  error: { code: string; message: string } | null;
  message: string | null;
};

export function ok<T>(data: T, message?: string): NextResponse<ApiEnvelope<T>> {
  return NextResponse.json(
    { data, error: null, message: message ?? null },
    { status: 200 },
  );
}

export function fail(
  status: number,
  code: string,
  message: string,
): NextResponse<ApiEnvelope<never>> {
  return NextResponse.json(
    { data: null, error: { code, message }, message: null },
    { status },
  );
}
