// No-op shim for the "server-only" package in Vitest. In Next.js, importing
// "server-only" from a client bundle throws at build time; in Node tests we
// just want it to be a no-op.
export {};
