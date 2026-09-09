<script setup>
    import { computed } from 'vue';
    import { useI18n } from '@/i18n/index.js';

    const { t } = useI18n();

    const props = defineProps({
        settings: {
            type: Object,
            required: true,
        },
    });

    const inputValue = computed({
        get() {
            return props.settings.customClashRules || '';
        },
        set(value) {
            props.settings.customClashRules = value;
        },
    });

    const ruleCount = computed(
        () =>
            inputValue.value
                .split(/\r?\n/)
                .map((line) => line.trim())
                .filter((line) => line && !line.startsWith('#') && !/^rules\s*:\s*$/i.test(line))
                .length
    );
</script>

<template>
    <div
        class="space-y-4 rounded-xl border border-gray-100/80 bg-white/90 p-6 shadow-xs dark:border-white/10 dark:bg-gray-900/70"
    >
        <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-3">
                <div
                    class="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-500/10"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-5 w-5 text-violet-600 dark:text-violet-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M9 5h10M9 12h10M9 19h10M5 5h.01M5 12h.01M5 19h.01"
                        />
                    </svg>
                </div>
                <div>
                    <h3 class="text-base font-semibold text-gray-900 dark:text-white">
                        {{ t('settings.clashRulesTitle') }}
                    </h3>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                        {{ t('settings.clashRulesDesc') }}
                    </p>
                </div>
            </div>
            <span
                v-if="ruleCount > 0"
                class="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
            >
                {{ t('settings.clashRulesCount', { count: ruleCount }) }}
            </span>
        </div>

        <div>
            <label
                class="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
            >
                {{ t('settings.clashRulesLabel') }}
            </label>
            <textarea
                v-model="inputValue"
                rows="12"
                spellcheck="false"
                :placeholder="t('settings.clashRulesPlaceholder')"
                class="block w-full rounded-lg border border-gray-200 bg-white px-4 py-3 font-mono text-xs leading-relaxed text-gray-900 shadow-sm transition-colors duration-200 focus:border-violet-500 focus:ring-violet-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
            <p class="mt-2 text-[10px] leading-relaxed text-gray-400 dark:text-gray-500">
                {{ t('settings.clashRulesHint') }}
            </p>
        </div>
    </div>
</template>
