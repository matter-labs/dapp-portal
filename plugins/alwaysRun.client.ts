import { storeToRefs } from "pinia";

import useColorMode from "@/composables/useColorMode";

import { useRouter } from "#app";
import { useNetworkStore } from "@/store/network";

export default defineNuxtPlugin(() => {
  useColorMode();

  const { version } = storeToRefs(useNetworkStore());
  watch(
    version,
    () => {
      document.documentElement.classList.remove("lite", "era");
      document.documentElement.classList.add(version.value);
    },
    { immediate: true }
  );

  const router = useRouter();
  router.onError((error, to) => {
    // Happens when new version is deployed and user has active session on the old version
    if (error?.message?.includes("Failed to fetch dynamically imported module")) {
      const win: Window = window; // ts error hack: https://github.com/microsoft/TypeScript/issues/48949
      win.location = to.fullPath;
    }
  });
});
