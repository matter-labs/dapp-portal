import { useClipboard, useThrottleFn } from "@vueuse/core";

export default (text: Ref<string>, copiedDuring = 1000) => {
  const { copy: clipboardCopy, copied: isCopied } = useClipboard({
    source: text,
    copiedDuring,
  });
  const tooltipShownViaLegacyCopy = ref(false);

  const showLegacyCopyTooltip = useThrottleFn(() => {
    tooltipShownViaLegacyCopy.value = true;
    setTimeout(() => {
      tooltipShownViaLegacyCopy.value = false;
    }, copiedDuring);
  }, copiedDuring);

  const copied = computed(() => isCopied.value || tooltipShownViaLegacyCopy.value);

  async function copy(altText?: string) {
    try {
      await clipboardCopy(altText as string);
    } catch (error) {
      legacyCopy();
      showLegacyCopyTooltip();
    }
  }
  function legacyCopy() {
    const ta = document.createElement("textarea");
    ta.value = text.value;
    ta.style.position = "absolute";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }

  return {
    copied,
    copy,
  };
};
