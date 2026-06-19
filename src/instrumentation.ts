// Removed duplicate Sentry.init() calls - @sentry/nextjs plugin already uses 
// sentry.server.config.ts and sentry.edge.config.ts for initialization

export const onRequestError = async (error: any, request: any, context: any) => {
  const Sentry = await import("@sentry/nextjs");
  return Sentry.captureRequestError(error, request, context);
};
