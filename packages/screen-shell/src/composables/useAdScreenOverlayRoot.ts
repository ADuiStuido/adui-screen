import { computed } from "vue";
import type { ComputedRef } from "vue";
import { useAdScreenShell } from "./useAdScreenShell";

export type AdOverlayRootMode = "scaled" | "unscaled";

export interface UseAdScreenOverlayRootResult {
  el: ComputedRef<HTMLElement | null>;
}

/**
 * 获取 AdScreenShell 提供的浮层挂载点。
 *
 * 背景：
 * - 一些 UI 组件库会把弹出层 Teleport 到 document.body，
 *   当 HUD 使用 transform: scale(...) 时会导致定位计算错位。
 * - 统一将弹出层挂载到 AdScreenShell 内部的 overlay root，可避免坐标系不一致。
 */
export function useAdScreenOverlayRoot(
  mode: AdOverlayRootMode = "unscaled",
): UseAdScreenOverlayRootResult {
  const ctxRef = useAdScreenShell();

  const el = computed<HTMLElement | null>(() => {
    const ctx = ctxRef.value;
    return mode === "scaled" ? ctx.overlayRootScaledEl : ctx.overlayRootUnscaledEl;
  });

  return { el };
}
