export function jsonOk<T>(data: T, init?: ResponseInit) {
  return Response.json({ ok: true, data, error: null }, init);
}

export function jsonError(message: string, status = 400, init?: ResponseInit) {
  return Response.json({ ok: false, data: null, error: message }, { status, ...init });
}
