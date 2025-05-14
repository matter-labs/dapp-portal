import { useAsyncState } from "@vueuse/core";
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { executeRoute, resumeRouteExecution, stopRouteExecution } from "zksync-easy-onramp";

import { useRoutesStore } from "@/store/on-ramp/routes";

import type { Route, UnexecutedRoute } from "zksync-easy-onramp";

export const useOrderProcessingStore = defineStore("order-processing", () => {
  const { updateRoute, removeRoute } = useRoutesStore();
  const order = ref<Route | null>(null);

  const orderStatus = computed(() => {
    switch (order.value?.status) {
      case "RUNNING":
      case "HALTING":
        return "IN_PROGRESS";
      case "HALTED":
        return "STOPPED";
      case "DONE":
        return "DONE";
      default:
        return "PENDING";
    }
  });

  const onUpdateHook = (executingRoute: Route) => {
    updateRoute(executingRoute);
    order.value = executingRoute;
  };

  const { setStep } = useOnRampStore();
  const {
    state: results,
    isReady,
    isLoading: inProgress,
    error,
    execute,
  } = useAsyncState(
    async () => {
      if (!order.value) {
        throw new Error("No order selected");
      }

      if (order.value.id) {
        const result = await resumeRouteExecution(order.value, { onUpdateHook });
        return result;
      } else {
        const result = await executeRoute(order.value, { onUpdateHook });
        return result;
      }
    },
    {} as Route,
    {
      immediate: false,
      onSuccess: (completedRoute: Route) => {
        updateRoute(completedRoute);
        if (completedRoute.status === "DONE") {
          removeRoute(completedRoute.id);
          setStep("complete");
        }
      },
    }
  );

  function selectQuote(route: UnexecutedRoute | Route) {
    order.value = route as Route;
  }

  function stopRoute() {
    if (order.value) {
      stopRouteExecution(order.value.id);
    }
  }

  return {
    order,
    orderStatus,
    execute,
    inProgress,
    isReady,
    error,
    results,
    selectQuote,
    stopRoute,
  };
});
