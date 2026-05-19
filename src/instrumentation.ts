export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
      tracesSampleRate: 1,
      // Setting this option to true will print useful information to the console while you're setting up Sentry.
      debug: false,
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
      tracesSampleRate: 1,
      // Setting this option to true will print useful information to the console while you're setting up Sentry.
      debug: false,
    });
  }
}

export const onRequestError = async (error: any, request: any, context: any) => {
  const Sentry = await import("@sentry/nextjs");
  return Sentry.captureRequestError(error, request, context);
};
