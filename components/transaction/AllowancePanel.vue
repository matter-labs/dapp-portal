<template>
  <CommonCardWithLineButtons class="mt-4">
    <DestinationItem
      v-if="enoughAllowance && setAllowanceReceipts?.length"
      as="div"
      :description="`You can now proceed to deposit`"
    >
      <template #label>
        {{ selectedToken?.symbol }} allowance approved
        <template v-for="allowanceReceipt in setAllowanceReceipts" :key="allowanceReceipt.transactionHash">
          <a
            v-if="blockExplorerUrl"
            :href="`${blockExplorerUrl}/tx/${allowanceReceipt.transactionHash}`"
            target="_blank"
            class="inline-flex items-center gap-1 underline underline-offset-2"
          >
            View on Explorer
            <ArrowTopRightOnSquareIcon class="h-6 w-6" aria-hidden="true" />
          </a>
        </template>
      </template>
      <template #image>
        <div class="aspect-square h-full w-full rounded-full bg-success-400 p-3 text-black">
          <CheckIcon aria-hidden="true" />
        </div>
      </template>
    </DestinationItem>
    <DestinationItem v-else as="div">
      <template #label>
        Approve {{ selectedToken?.symbol }} allowance
        <template v-for="allowanceTransactionHash in setAllowanceTransactionHashes" :key="allowanceTransactionHash">
          <a
            v-if="blockExplorerUrl && allowanceTransactionHash"
            :href="`${blockExplorerUrl}/tx/${allowanceTransactionHash}`"
            target="_blank"
            class="inline-flex items-center gap-1 underline underline-offset-2"
          >
            View on Explorer
            <ArrowTopRightOnSquareIcon class="h-6 w-6" aria-hidden="true" />
          </a>
        </template>
      </template>
      <template #underline>
        Before depositing you need to give our bridge permission to spend specified amount of
        {{ selectedToken?.symbol }}.
        <span v-if="allowance && allowance !== 0n"
          >You can deposit up to
          <CommonButtonLabel variant="light" @click="setAmountToCurrentAllowance()">
            {{ parseTokenAmount(allowance!, selectedToken!.decimals) }}
          </CommonButtonLabel>
          {{ selectedToken!.symbol }} without approving a new allowance.
        </span>
        <CommonButtonLabel variant="light" as="a" :href="TOKEN_ALLOWANCE" target="_blank">
          Learn more
        </CommonButtonLabel>
      </template>
      <template #image>
        <div class="aspect-square h-full w-full rounded-full bg-warning-400 p-3 text-black">
          <LockClosedIcon aria-hidden="true" />
        </div>
      </template>
    </DestinationItem>
  </CommonCardWithLineButtons>
</template>

<script lang="ts" setup>
import { LockClosedIcon, ArrowTopRightOnSquareIcon, CheckIcon } from "@heroicons/vue/24/outline";

import type { Token } from "@/types";
import type { Hash } from "viem";

const props = defineProps<{
  tokenAddress: string;
  assetId: string;
  selectedToken: Token;
  enoughAllowance: boolean;
  blockExplorerUrl: string | undefined;
  allowance: bigint;
  setAllowanceReceipts: { transactionHash: Hash }[] | undefined;
  setAllowanceTransactionHashes: (Hash | undefined)[];
}>();

const emit = defineEmits<{
  (e: "setAmount", amount: bigint): void;
}>();

const setAmountToCurrentAllowance = () => {
  if (!props.allowance) {
    return;
  }
  emit("setAmount", props.allowance);
};
</script>
