<script setup lang="ts">
import { useAdScreenOverlayRoot } from '@adui/screen-shell'
import { onMounted, watchEffect } from 'vue'

const { el } = useAdScreenOverlayRoot('scaled') // 或 'unscaled'

watchEffect(() => {
  // el.value 在 AdScreenShell 渲染完 overlay root 后会变成 HTMLElement
  // 这里是最稳的拿法
  // @eslint-disable-next-line no-console
  console.log('[overlayRoot]', el.value)
})

onMounted(() => {
  // 这里也能用，但 watchEffect 更直观
})
</script>

<template>
  <!-- 不需要渲染内容 -->
  <div style="display: none" />
</template>
