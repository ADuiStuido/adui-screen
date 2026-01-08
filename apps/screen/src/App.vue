<script setup lang="ts">
import { AdScreenShell } from '@adui/screen-shell'
import AdCesiumHost from '@/components/AdCesiumHost.vue'
import BizOverlayBridge from '@/components/BizOverlayBridge.vue'
</script>

<template>
  <div style="width: 100vw; height: 100vh; overflow: hidden">
    <AdScreenShell
      :designWidth="1920"
      :designHeight="1080"
      scale-mode="contain"
      :wrapper-style="{ pointerEvents: 'none' }"
    >
      <template #engine>
        <AdCesiumHost />
      </template>

      <template #hud>
        <div style="width: 100%; height: 100%; pointer-events: none">
          <BizOverlayBridge />
          <div style="color: white">HUD</div>
        </div>
      </template>
    </AdScreenShell>
  </div>
</template>
