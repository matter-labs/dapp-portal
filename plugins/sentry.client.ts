import * as Sentry from "@sentry/vue";

export default defineNuxtPlugin((nuxtApp) => {
  const { vueApp } = nuxtApp;

  const config = useRuntimeConfig();

  const sentryDSN = (config.public.sentryDSN as string) || "";

  if (!sentryDSN) {
    return;
  }

  const sentryENV = (config.public.sentryENV as string) || "localhost";

  Sentry.init({
    app: [vueApp],
    dsn: sentryDSN,
    environment: sentryENV,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
        maskAllInputs: false,
      }),
      Sentry.captureConsoleIntegration({
        handled: true,
      }),
    ],
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: config.public.sentryENV === "production" ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,
  });

  vueApp.mixin(
    Sentry.createTracingMixins({ trackComponents: true, timeout: 2000, hooks: ["activate", "mount", "update"] })
  );
  Sentry.attachErrorHandler(vueApp, {
    attachProps: true,
    attachErrorHandler: true,
  });

  return {
    provide: {
      sentrySetContext: Sentry.setContext,
      sentrySetUser: Sentry.setUser,
      sentrySetTag: Sentry.setTag,
      sentryAddBreadcrumb: Sentry.addBreadcrumb,
      sentryCaptureException: Sentry.captureException,
    },
  };
});
