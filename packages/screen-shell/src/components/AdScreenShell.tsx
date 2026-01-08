import {
  defineComponent,
  ref,
  computed,
  provide,
  onMounted,
  onBeforeUnmount,
  type Ref,
} from "vue";

import type { AdScreenScaleMode, AdScreenShellContext } from "../types";
import { AdScreenShellKey } from "../composables/useAdScreenShell";

/**
 * AdScreenShell（TSX 版）
 *
 * 设计目标（严格符合 ADui Screen 规范）：
 * 1) 引擎层（Cesium 等）必须真实像素渲染，禁止 CSS transform scale/zoom
 * 2) HUD/UI 层可以缩放，但必须与引擎层分层解耦
 * 3) 容器尺寸必须可测量、可追踪（ResizeObserver）
 */
export const AdScreenShell = defineComponent({
  name: "AdScreenShell",

  props: {
    /**
     * 设计稿宽度（例如 1920）
     */
    designWidth: { type: Number, required: true },

    /**
     * 设计稿高度（例如 1080）
     */
    designHeight: { type: Number, required: true },

    /**
     * HUD 缩放策略（默认 fit）
     */
    scaleMode: { type: String as () => AdScreenScaleMode, default: "fit" },

    /**
     * 是否允许放大 HUD（容器大于设计稿时）
     * - true：容器更大时 HUD 可放大
     * - false：最大缩放为 1（只缩小不放大）
     */
    allowUpscale: { type: Boolean, default: true },
  },

  setup(props, { slots }) {
    /**
     * 壳根容器（必须可测量尺寸）
     */
    const rootEl = ref<HTMLElement | null>(null);

    /**
     * 实时容器尺寸（真实像素）
     */
    const containerWidth = ref<number>(0);
    const containerHeight = ref<number>(0);

    /**
     * 计算 rawScale：根据容器尺寸与设计稿尺寸计算缩放比例
     */
    const rawScale = computed<number>(() => {
      const w = containerWidth.value;
      const h = containerHeight.value;
      const dw = props.designWidth;
      const dh = props.designHeight;

      if (dw <= 0 || dh <= 0) return 1;
      if (w <= 0 || h <= 0) return 1;

      const sx = w / dw;
      const sy = h / dh;

      switch (props.scaleMode) {
        case "fit":
        case "contain":
          // 完整显示：取更小的比例
          return Math.min(sx, sy);
        case "cover":
          // 铺满裁切：取更大的比例
          return Math.max(sx, sy);
        case "width":
          // 按宽度缩放
          return sx;
        case "height":
          // 按高度缩放
          return sy;
        case "none":
          // 不缩放 HUD
          return 1;
        default: {
          // TS 穷尽检查：未来扩展 scaleMode 时这里会提示
          const _never: never = props.scaleMode;
          void _never;
          return 1;
        }
      }
    });

    /**
     * clamp 逻辑：如果不允许放大，则最大 scale=1
     */
    const scale = computed<number>(() => {
      const s = rawScale.value;
      if (!Number.isFinite(s) || s <= 0) return 1;
      if (!props.allowUpscale) return Math.min(1, s);
      return s;
    });

    /**
     * 对外提供的上下文（响应式）
     * - 注意：引擎层不缩放，所以 scale 只代表 HUD 的缩放倍数
     */
    const contextRef: Ref<AdScreenShellContext> = ref({
      scale: 1,
      designWidth: props.designWidth,
      designHeight: props.designHeight,
      containerWidth: 0,
      containerHeight: 0,
    });

    provide(AdScreenShellKey, contextRef);

    /**
     * ResizeObserver：监听壳容器尺寸变化
     * - 这是大屏稳定性的关键：引擎层必须知道真实像素尺寸
     */
    let ro: ResizeObserver | null = null;

    onMounted(() => {
      const el = rootEl.value;
      if (!el) return;

      ro = new ResizeObserver((entries: ResizeObserverEntry[]) => {
        const entry = entries[0];
        if (!entry) return;

        const { width, height } = entry.contentRect;

        containerWidth.value = width;
        containerHeight.value = height;

        // 更新 context（保持响应式）
        contextRef.value = {
          scale: scale.value,
          designWidth: props.designWidth,
          designHeight: props.designHeight,
          containerWidth: width,
          containerHeight: height,
        };
      });

      ro.observe(el);
    });

    onBeforeUnmount(() => {
      if (ro && rootEl.value) ro.unobserve(rootEl.value);
      ro = null;
    });

    /**
     * 渲染结构（分层是硬约束）：
     * - engine slot：真实像素层，不做任何 transform/scale
     * - hud slot：允许 transform scale（发生在 HUD 内容层）
     */
    return () => (
      <div ref={rootEl} class="ad-screen-shell">
        {/* 引擎层：绝不做 transform/scale */}
        <div class="ad-screen-shell__engine">{slots.engine?.()}</div>

        {/* HUD 视口层：覆盖全屏，本身不缩放 */}
        <div class="ad-screen-shell__hud-viewport">
          {/* HUD 内容层：只在这里缩放 */}
          <div
            class="ad-screen-shell__hud"
            style={{
              width: `${props.designWidth}px`,
              height: `${props.designHeight}px`,
              transform:
                props.scaleMode === "none" ? "none" : `scale(${scale.value})`,
              transformOrigin: "0 0",
            }}
          >
            {slots.hud?.()}
          </div>
        </div>
      </div>
    );
  },
});
