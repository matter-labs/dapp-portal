<template>
  <div>
    <PageTitle :fallback-route="{ name: 'assets' }">Send</PageTitle>

    <div class="space-y-4">
      <CommonCardWithLineButtons size="sm">
        <DestinationItem
          v-bind="destinations.era"
          :label="`Send to another account on ${destinations.era.label}`"
          as="RouterLink"
          :to="{ name: 'send', query: $route.query }"
        />
      </CommonCardWithLineButtons>
      <CommonCardWithLineButtons>
        <DestinationItem
          v-if="eraNetwork.l1Network"
          v-bind="destinations.ethereum"
          :label="`Bridge to ${destinations.ethereum.label}`"
          as="RouterLink"
          :to="{ name: 'bridge-withdraw', query: $route.query }"
        />
      </CommonCardWithLineButtons>
      <CommonCardWithLineButtons v-if="eraNetwork.displaySettings?.showPartnerLinks">
        <DestinationItem
          :label="`Bridge to other networks`"
          :description="`Explore ecosystem of third party bridges`"
          :icon="ArrowTopRightOnSquareIcon"
          as="a"
          href="https://zksync.dappradar.com/ecosystem?category=defi_bridge"
          target="_blank"
        >
          <template #image>
            <DestinationIconContainer>
              <Squares2X2Icon aria-hidden="true" />
            </DestinationIconContainer>
          </template>
        </DestinationItem>
      </CommonCardWithLineButtons>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ArrowTopRightOnSquareIcon, Squares2X2Icon } from "@heroicons/vue/24/outline";

const { destinations } = storeToRefs(useDestinationsStore());
const { eraNetwork } = storeToRefs(useZkSyncProviderStore());
</script>

<style lang="scss" scoped></style>
