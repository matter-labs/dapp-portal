import { useStorage } from "@vueuse/core";
import { defineStore } from "pinia";
import { computed } from "vue";

import type { Route } from "zksync-easy-onramp";

export const useRoutesStore = defineStore("routes", () => {
  const _routes = useStorage<Record<Route["id"], Route>>("onramp-routes", {});

  const routes = computed(() => {
    return Object.values(_routes.value);
  });

  const updateRoute = (route: Route) => {
    if (route.id) {
      _routes.value[route.id] = route;
    }
  };

  const removeRoute = (routeId: string) => {
    if (routeId) {
      delete _routes.value[routeId];
    }
  };

  return {
    routes,
    updateRoute,
    removeRoute,
  };
});
