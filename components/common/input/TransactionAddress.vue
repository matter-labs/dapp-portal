<template>
  <CommonContentBlock for="transaction-address-input" as="label" class="transaction-address-input">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-2 overflow-hidden">
        <div class="font-bold">{{ label }}</div>
        <slot name="dropdown" />
      </div>
      <div v-if="!addressInputHidden && defaultLabel && isConnected">
        <span class="font-bold">{{ inputVisible ? "To another account" : defaultLabel }}</span>
        <CommonButtonLabel
          variant="light"
          class="ml-1"
          data-testid="change-account-button"
          @click="toggleCustomValue()"
        >
          {{ inputVisible ? "Use my account" : "Change" }}
        </CommonButtonLabel>
      </div>
    </div>
    <div v-if="inputVisible" class="mt-4">
      <div class="flex items-center gap-2">
        <CommonInputLine
          id="transaction-address-input"
          v-model.trim="inputted"
          :has-error="!!addressError"
          placeholder="Address or ENS"
          type="text"
          maxlength="42"
          spellcheck="false"
          autocomplete="off"
          class="w-full text-lg"
        />
        <CommonQrUploadIconButton v-if="isMobile()" class="h-6 w-6" @decoded-address="inputted = $event" />
      </div>
      <transition v-bind="TransitionOpacity()">
        <CommonCardWithLineButtons v-if="selectAddressVisible" class="select-address-popover">
          <AddressCardLoader v-if="ensParseInProgress" />
          <AddressCard
            v-else-if="ensAddress"
            size="sm"
            :name="inputted"
            :address="ensAddress"
            @click="inputted = ensAddress"
          />
          <CommonErrorBlock v-else-if="ensParseError" @try-again="parseEns">
            {{ ensParseError }}
          </CommonErrorBlock>
          <AddressCard
            v-else-if="previousTransactionAddress"
            size="sm"
            name="Previous transaction address"
            :address="previousTransactionAddress"
            @click="inputted = previousTransactionAddress"
          />
        </CommonCardWithLineButtons>
      </transition>
    </div>
    <slot name="input-body" />
    <CommonInputErrorMessage>
      <transition v-bind="TransitionOpacity()">
        <span v-if="addressError">
          <template v-if="addressError === 'invalid_address'">Invalid Ethereum 0x address</template>
          <template v-else-if="addressError === 'ens_not_found'">Nothing found for this name</template>
        </span>
      </transition>
    </CommonInputErrorMessage>
  </CommonContentBlock>
</template>

<script lang="ts" setup>
import { isAddress } from "viem";

const props = defineProps({
  label: {
    type: String,
    default: "Receiver",
  },
  modelValue: {
    type: String,
    default: "",
  },
  defaultLabel: {
    type: String,
  },
  addressInputHidden: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits<{
  (eventName: "update:error", error?: string): void;
  (eventName: "update:modelValue", amount: string): void;
}>();

const inputted = computed({
  get: () => props.modelValue,
  set: (value: string) => emit("update:modelValue", value),
});

const { isConnected } = storeToRefs(useOnboardStore());

const usingCustomValue = ref(!!inputted.value);
const toggleCustomValue = () => {
  usingCustomValue.value = !usingCustomValue.value;
  if (usingCustomValue.value) {
    nextTick(() => {
      const inputElement = document?.getElementById("transaction-address-input");
      inputElement?.focus?.();
    });
  } else {
    inputted.value = "";
  }
};

const inputVisible = computed(() => {
  return !props.addressInputHidden && (!props.defaultLabel || usingCustomValue.value || inputted.value);
});

const isAddressValid = computed(() => isAddress(inputted.value));

const {
  address: ensAddress,
  isValidEnsFormat,
  inProgress: ensParseInProgress,
  error: ensParseError,
  parseEns,
} = useEnsName(inputted);

const { previousTransactionAddress } = storeToRefs(usePreferencesStore());

const selectAddressVisible = computed(() => {
  return (
    (!inputted.value && previousTransactionAddress.value) ||
    ensParseInProgress.value ||
    ensAddress.value ||
    ensParseError.value
  );
});

const addressError = computed(() => {
  if (inputted.value && !isAddressValid.value && !isValidEnsFormat.value) {
    return "invalid_address";
  } else if (isValidEnsFormat.value && !ensParseInProgress.value && !ensAddress.value) {
    return "ens_not_found";
  }
  return undefined;
});
watch(
  addressError,
  (value) => {
    emit("update:error", value);
  },
  { immediate: true }
);
</script>

<style lang="scss" scoped>
.transaction-address-input {
  @apply relative;
  &:has(#transaction-address-input:focus) {
    .select-address-popover {
      @apply pointer-events-auto opacity-100;
    }
  }

  .select-address-popover {
    @apply pointer-events-none absolute left-0 top-full z-[11] mt-1 w-full opacity-0 transition-opacity duration-300 hover:pointer-events-auto;
    &:not(:hover) {
      @apply focus-within:pointer-events-auto focus-within:opacity-100;
    }
  }
}
</style>
