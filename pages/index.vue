<template>
  <div></div>
</template>

<script lang="ts" setup>
const router = useRouter();
const { eraNetwork } = storeToRefs(useZkSyncProviderStore());

const newUrl = new URL(window.location.href);
newUrl.pathname = eraNetwork.value.l1Network ? "/bridge" : "/assets";
await router.replace(newUrl.href.slice(newUrl.origin.length));
</script>
