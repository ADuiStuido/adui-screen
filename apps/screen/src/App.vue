<script setup lang="ts">
import { AdScreenShell } from '@adui/screen-shell'
</script>

<template>
  <div style="width: 100vw; height: 100vh;overflow: hidden">
    <AdScreenShell :designWidth="1920" :designHeight="1080" scale-mode="contain">
      <template #engine>
        <div style="background: #0b1020; width: 100%; height: 100%" />
      </template>
      <template #hud>
        <div style="color: white">HUD</div>
      </template>
    </AdScreenShell>
  </div>
</template>

<style scoped></style>
