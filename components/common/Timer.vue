<template>
  <slot v-bind="{ timer, isTimerFinished }">
    <span class="tabular-nums">{{ timer }}</span>
  </slot>
</template>

<script lang="ts" setup>
const props = defineProps({
  futureDate: {
    type: String,
    required: true,
  },
  format: {
    type: String,
    default: "hh:mm:ss", // 'hh:mm:ss' for "00:00:00", 'human-readable' for "1 hour 30 minutes"
  },
});
const emit = defineEmits<{
  (eventName: "finish"): void;
}>();

const diff = ref(0);
const timer = ref("");
const isTimerFinished = computed(() => diff.value === 0);

watch(
  isTimerFinished,
  (isFinished) => {
    if (isFinished) {
      emit("finish");
    }
  },
  { immediate: true }
);

let intervalId: ReturnType<typeof setInterval> | undefined;

const formatTimeDiff = (diff: number): string => {
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (props.format === "human-readable") {
    let formattedString = "";
    if (hours > 0) formattedString += $t("timer.hours", { count: hours });
    if (minutes > 0) formattedString += $t("timer.minutes", { count: minutes });
    if (!formattedString.length) formattedString += $t("timer.seconds", { count: seconds });
    return formattedString.trim();
  } else {
    // Default format: "00:00:00"
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }
};

const updateTimer = () => {
  const currentTime = new Date().getTime();
  const targetTime = new Date(props.futureDate).getTime();
  diff.value = Math.max(targetTime - currentTime, 0);
  timer.value = formatTimeDiff(diff.value);

  if (diff.value === 0) {
    clearInterval(intervalId);
  }
};

onBeforeMount(() => {
  updateTimer();
  intervalId = setInterval(updateTimer, 1000);
});

onBeforeUnmount(() => {
  clearInterval(intervalId);
});
</script>
