<template>
  <Menu v-slot="{ open }" as="div" class="language-switcher-container">
    <MenuButton as="template">
      <CommonButtonDropdown :toggled="open">
        <template #left-icon>
          <GlobeAltIcon />
        </template>
        <span>{{ currentLocaleName }}</span>
      </CommonButtonDropdown>
    </MenuButton>

    <transition v-bind="TransitionAlertScaleInOutTransition">
      <MenuItems class="language-options-container">
        <div v-for="loc in availableLocales" :key="loc.code">
          <MenuItem v-slot="{ active }" as="template">
            <CommonButtonDropdown
              size="sm"
              no-chevron
              class="options-item"
              :class="{ 'bg-neutral-200 dark:bg-neutral-800': active }"
              @click="changeLanguage(loc.code)"
            >
              <template #left-icon>
                <GlobeAltIcon />
              </template>
              <span>{{ loc.name }}</span>
              <template #right-icon>
                <CheckIcon v-if="locale === loc.code" aria-hidden="true" />
              </template>
            </CommonButtonDropdown>
          </MenuItem>
        </div>
      </MenuItems>
    </transition>
  </Menu>
</template>

<script lang="ts" setup>
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/vue";
import { CheckIcon, GlobeAltIcon } from "@heroicons/vue/24/outline";

import { TransitionAlertScaleInOutTransition } from "@/utils/transitions";

const { locale, locales, setLocale } = useI18n();

const availableLocales = computed(() => locales.value);
const currentLocaleName = computed(() => {
  const current = availableLocales.value.find((loc) => loc.code === locale.value);
  return current ? current.name : locale.value;
});

const changeLanguage = (newLocale: string) => {
  setLocale(newLocale);
};
</script>

<style lang="scss" scoped>
.language-switcher-container {
  @apply relative;

  .language-options-container {
    @apply absolute right-0 top-full z-10 mt-0.5 h-max w-max min-w-full rounded-3xl bg-neutral-100 p-1 shadow-lg dark:bg-neutral-900;

    .options-item {
      @apply w-full;
    }
  }
}
</style>
