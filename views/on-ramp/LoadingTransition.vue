<template>
  <div class="px-6 py-4">
    <div class="mb-2">
      <svg
        class="-ml-1 mr-3 inline-block size-5 animate-spin text-black dark:text-white"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
      <span class="font-bold">Finding quotes</span>
    </div>
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl dark:bg-neutral-900">
      <div className="flex gap-2 p-3 animate-pulse items-center">
        <div className="basis-2/3">
          <div class="flex flex-col gap-2">
            <div>
              <div class="h-4 w-[40%] rounded bg-neutral-400 dark:bg-neutral-600"></div>
            </div>
            <div>
              <div class="h-2 w-[40%] rounded bg-neutral-400 dark:bg-neutral-600"></div>
            </div>
          </div>
        </div>
        <div className="flex basis-1/3 items-center justify-end">
          <div className="inline-block p-2">
            <div class="h-8 w-8 rounded-full bg-neutral-400 dark:bg-neutral-600"></div>
          </div>
          <div className="inline-block">
            <div>
              <div class="mb-2 h-2 w-[80px] rounded bg-neutral-400 dark:bg-neutral-600"></div>
            </div>
            <div>
              <div class="h-2 w-[70px] rounded bg-neutral-400 dark:bg-neutral-600"></div>
            </div>
          </div>
          <div className="ml-2 h-6 w-6 border rounded-full border-neutral-300 dark:border-neutral-700 p-0.5"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts"></script>
