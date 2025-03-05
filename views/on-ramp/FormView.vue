<template>
  <CommonContentBlock>
    <div class="flex flex-col gap-4">
      <div>
        <span class="font-bold">You pay</span>
      </div>
      <div class="flex items-center justify-stretch gap-4">
        <template v-if="step === 'processing'">
          <div v-if="order" class="flex items-center justify-stretch gap-4">
            <span class="py-4 text-3xl">{{ formatFiat(order.pay.fiatAmount, order.pay.currency) }}</span>
            <div class="py-4">
              <span class="inline-block align-middle text-lg leading-6 text-gray-700 dark:text-white">{{
                order.pay.currency
              }}</span>
            </div>
          </div>
        </template>
        <template v-if="step === 'buy' || step === 'quotes'">
          <input v-model="fiatAmount" placeholder="20.00" class="grow rounded-3xl p-4 text-3xl dark:bg-neutral-800" />
          <div class="rounded-3xl bg-gray-300 p-4 py-5 dark:bg-neutral-950">
            <span class="inline-block align-middle text-lg leading-6 text-gray-700 dark:text-white">USD</span>
          </div>
        </template>
      </div>
    </div>
  </CommonContentBlock>
</template>

<script lang="ts" setup>
const { step } = storeToRefs(useOnRampStore());
const fiatAmount = defineModel<string>({ required: true });

const { order } = storeToRefs(useOrderProcessingStore());
</script>
