import { useMemoize } from "@vueuse/core";
import { $fetch } from "ofetch";

const SCREENING_REQUEST_TIMEOUT = 15_000;

/* Returns void if address screening was successful */
/* Fails if address screening was unsuccessful or could not be completed */
const screenAddress = useMemoize(async (address: string) => {
  const portalRuntimeConfig = usePortalRuntimeConfig();
  if (!portalRuntimeConfig.screeningApiUrl) return;

  const url = new URL(portalRuntimeConfig.screeningApiUrl);
  url.searchParams.append("address", address);
  /* The time limit covers the whole request, including the automatic retry and reading the response body */
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SCREENING_REQUEST_TIMEOUT);
  const response = await $fetch(url.toString(), { signal: controller.signal })
    .catch((error) => {
      throw new Error("Address screening is temporarily unavailable. Please try again later.", { cause: error });
    })
    .finally(() => clearTimeout(timer));
  if (!response?.result) {
    throw new Error("We were unable to process this transaction...");
  }
});

/* Only successful screenings stay cached, a failed check is repeated on the next attempt */
const validateAddress = (address: string) =>
  screenAddress(address).catch((error) => {
    screenAddress.delete(address);
    throw error;
  });

export default () => {
  return {
    validateAddress,
  };
};
