<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useCesiumViewer } from '@/hooks/cesium/useCesiumViewer'

const hostEl = ref<HTMLDivElement | null>(null)

const { init, resize } = useCesiumViewer()

let ro: ResizeObserver | null = null

onMounted(async () => {
  const el = hostEl.value
  if (!el) return

  // 初始化 Cesium Viewer（单例）
  await init(el)

  // 真实像素 resize：不允许 transform scale，因此必须监听容器尺寸变化
  ro = new ResizeObserver(() => {
    resize()
  })
  ro.observe(el)

  // 首次 resize
  resize()
})

onBeforeUnmount(() => {
  const el = hostEl.value
  if (ro && el) ro.unobserve(el)
  ro = null
})
</script>

<template>
  <div ref="hostEl" class="ad-cesium-host" />
</template>

<style scoped>
.ad-cesium-host {
  width: 100%;
  height: 100%;
  /* Cesium canvas 需要稳定承载 */
  position: relative;
  overflow: hidden;
}
</style>
