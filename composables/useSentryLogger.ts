import { storeToRefs } from "pinia";

import { useOnboardStore } from "@/store/onboard";
import { sentryCaptureException } from "@/utils/sentry-logger";

import type { SentryCaptureExceptionParams } from "@/utils/sentry-logger";

export const useSentryLogger = () => {
  const onboardStore = useOnboardStore();
  const { account } = storeToRefs(onboardStore);

  const captureException = (params: Omit<SentryCaptureExceptionParams, "accountAddress">) => {
    sentryCaptureException({ ...params, accountAddress: account?.value?.address || "" });
  };

  return { captureException };
};
