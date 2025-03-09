<template>
  <CommonModal v-model:opened="isModalOpened" class="token-select-modal" :title="title" @after-leave="search = ''">
    <Combobox v-model="selectedToken">
      <!-- TODO: Refactor this to use ComboboxInput as main component but look like CommonInputSearch -->
      <CommonInputSearch
        v-model.trim="search"
        class="mb-block-padding-1/4"
        placeholder="Symbol or address"
        autofocus="desktop"
      >
        <template #icon>
          <MagnifyingGlassIcon aria-hidden="true" />
        </template>
      </CommonInputSearch>
      <div class="-mx-block-padding-1/2 h-full overflow-auto px-block-padding-1/2">
        <template v-if="loading">
          <div class="-mx-block-padding-1/2">
            <TokenBalanceLoader v-for="index in 2" :key="index" variant="light" />
          </div>
        </template>
        <template v-else-if="error">
          <CommonErrorBlock class="m-2" @try-again="emit('try-again')">
            {{ error.message }}
          </CommonErrorBlock>
        </template>
        <template v-else-if="!hasBalances && (!search || displayedTokens.length)">
          <CommonLineButtonsGroup class="category" :gap="false" :margin-y="false">
            <TokenLine
              v-for="item in displayedTokens"
              :key="item.address"
              class="token-line"
              v-bind="item"
              data-testid="token-select-button"
              @click="selectedToken = item"
            />
          </CommonLineButtonsGroup>
        </template>
        <template v-else-if="balanceGroups.length || !search">
          <div v-for="(group, index) in balanceGroups" :key="index" class="category">
            <TypographyCategoryLabel size="sm" variant="darker" class="group-category-label">
              {{ group.title || "Your assets" }}
            </TypographyCategoryLabel>
            <CommonLineButtonsGroup :gap="false">
              <TokenBalance
                v-for="item in group.balances"
                v-bind="item"
                :key="item.address"
                variant="light"
                data-testid="token-select-button"
                @click="selectedToken = item"
              />
            </CommonLineButtonsGroup>
          </div>
        </template>
        <p v-else class="mt-block-padding-1/2 text-center">
          <template v-if="isConnected">
            No tokens for "{{ search }}" were found on connected account
            <br />
            <span class="mt-1.5 inline-block">Make sure you are using correct ZKsync network</span>
          </template>
          <template v-else>Connect wallet to see all tokens available for you</template>
        </p>
        <slot name="body-bottom" />
      </div>
    </Combobox>
  </CommonModal>
</template>

<script lang="ts" setup>
import { Combobox } from "@headlessui/vue";
import { MagnifyingGlassIcon } from "@heroicons/vue/24/outline";

import type { Token, TokenAmount } from "@/types";

const props = defineProps({
  title: {
    type: String,
    default: "Choose token",
  },
  opened: {
    type: Boolean,
    default: false,
  },
  tokenAddress: {
    type: String,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: Error,
  },
  tokens: {
    type: Array as PropType<Token[]>,
    default: () => [],
  },
  balances: {
    type: Array as PropType<TokenAmount[]>,
    default: () => [],
  },
});

const emit = defineEmits<{
  (eventName: "update:opened", value: boolean): void;
  (eventName: "update:tokenAddress", tokenAddress?: string): void;
  (eventName: "try-again"): void;
}>();

const { isConnected } = storeToRefs(useOnboardStore());

const search = ref("");
const hasBalances = computed(() => props.balances.length > 0);
const filterTokens = (tokens: Token[]) => {
  const lowercaseSearch = search.value.toLowerCase();
  return tokens.filter(({ address, name, symbol }) =>
    Object.values({ address, name, symbol })
      .filter((e) => typeof e === "string")
      .some((value) => value!.toLowerCase().includes(lowercaseSearch))
  );
};
const displayedTokens = computed(() => filterTokens(props.tokens));
const displayedBalances = computed(() => filterTokens(props.balances) as TokenAmount[]);
const balanceGroups = groupBalancesByAmount(displayedBalances);

const selectedTokenAddress = computed({
  get: () => props.tokenAddress,
  set: (value) => emit("update:tokenAddress", value),
});
const selectedToken = computed({
  get: () => {
    if (!props.tokens) {
      return undefined;
    }
    return props.tokens.find((e) => e.address === selectedTokenAddress.value);
  },
  set: (value) => {
    if (value) {
      selectedTokenAddress.value = value.address;
    } else {
      selectedTokenAddress.value = undefined;
    }
    closeModal();
  },
});

const isModalOpened = computed({
  get: () => props.opened,
  set: (value) => emit("update:opened", value),
});
const closeModal = () => {
  isModalOpened.value = false;
};
</script>

<style lang="scss">
.token-select-modal {
  .modal-card {
    @apply grid h-full grid-rows-[max-content_max-content_1fr];
  }
  .category:first-child .group-category-label {
    @apply mt-block-padding-1/2;
  }
}
</style>
