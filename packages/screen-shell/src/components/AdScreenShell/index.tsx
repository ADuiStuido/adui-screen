import {
  defineComponent,
  ref,
  reactive,
  computed,
  provide,
  onMounted,
  onBeforeUnmount,
  nextTick,
  watch,
  type CSSProperties,
  type PropType,
  type Ref,
} from "vue";
import type {
  AdScreenScaleMode,
  AdScreenShellContext,
} from "../../types/types";
import { AdScreenShellKey } from "../../composables/useAdScreenShell";

/* ============================================================
 * 工具：防抖函数（严格类型，不依赖第三方库）
 * ============================================================ */
type DebouncedFn = {
  (): void;
  cancel: () => void;
};

function debounce(fn: () => void, delay: number): DebouncedFn {
  let timer: number | null = null;

  const wrapped = (): void => {
    if (timer !== null) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = null;
      fn();
    }, delay);
  };

  wrapped.cancel = (): void => {
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
  };

  return wrapped;
}

/* ============================================================
 * AdScreenShell（最终版）
 *
 * 核心设计目标：
 * 1. HUD 层可缩放（transform scale），用于大屏 UI 适配
 * 2. Engine 层（Cesium 等）禁止 transform，保持真实像素渲染
 * 3. Engine 只渲染 HUD 覆盖到的区域（通过裁剪视口实现）
 * 4. HUD 像“遮罩面板”，Engine 是被遮罩的内容
 *
 * 关键结论：
 * - 不通过 scale 改变 Engine
 * - 仅通过“改变 Engine 容器尺寸 + overflow:hidden”控制可视区域
 * ============================================================ */
export const AdScreenShell = defineComponent({
  name: "AdScreenShell",

  props: {
    /** 设计稿宽度（例如 1920） */
    designWidth: { type: Number, default: 1920 },

    /** 设计稿高度（例如 1080） */
    designHeight: { type: Number, default: 1080 },

    /**
     * 是否铺满（非等比缩放）
     * - true：HUD 使用 scale(sx, sy) 直接铺满容器
     * - false：HUD 等比缩放 + 居中
     */
    fullScreen: { type: Boolean, default: false },

    /** HUD 缩放模式（保留扩展位） */
    scaleMode: {
      type: String as PropType<AdScreenScaleMode>,
      default: "fit",
    },

    /** 是否允许放大（容器大于设计稿时） */
    allowUpscale: { type: Boolean, default: true },

    /** resize 防抖延迟（毫秒） */
    delay: { type: Number, default: 500 },

    /** 外部覆写壳样式（禁止 transform） */
    shellStyle: {
      type: Object as PropType<CSSProperties>,
      default: undefined,
    },

    /** 外部覆写 HUD wrapper 样式（禁止覆盖 transform / margin） */
    wrapperStyle: {
      type: Object as PropType<CSSProperties>,
      default: undefined,
    },
  },

  setup(props, { slots }) {
    /* ============================================================
     * DOM 引用
     * ============================================================ */

    /** 壳容器：表示当前页面真实可用空间 */
    const shellEl = ref<HTMLElement | null>(null);

    /** HUD 包装层：执行 scale + margin 居中 */
    const hudWrapperEl = ref<HTMLElement | null>(null);

    /** Engine 视口：裁剪 Engine 的显示区域 */
    const engineViewportEl = ref<HTMLElement | null>(null);

    /* ============================================================
     * 内部状态
     * ============================================================ */

    /** 设计稿尺寸与原始容器尺寸 */
    const state = reactive({
      originalWidth: 0,
      originalHeight: 0,
      width: 0,
      height: 0,
    });

    /** 等比场景下的统一缩放值（供业务侧使用） */
    const scale = ref<number>(1);

    /**
     * HUD 缩放后的最终可视矩形
     * - EngineViewport 将严格使用这组值
     */
    const viewportLayout = reactive({
      left: 0,
      top: 0,
      width: 0,
      height: 0,
    });

    /* ============================================================
     * 对外提供的上下文（供业务 / Engine hooks 使用）
     * ============================================================ */

    const contextRef: Ref<AdScreenShellContext> = ref({
      scale: 1,
      designWidth: props.designWidth,
      designHeight: props.designHeight,
      containerWidth: 0,
      containerHeight: 0,
    });

    provide(AdScreenShellKey, contextRef);

    const syncContext = (cw: number, ch: number): void => {
      contextRef.value = {
        scale: scale.value,
        designWidth: props.designWidth,
        designHeight: props.designHeight,
        containerWidth: cw,
        containerHeight: ch,
      };
    };

    /* ============================================================
     * 初始化尺寸
     * ============================================================ */

    const initializeDimensions = async (): Promise<void> => {
      const shell = shellEl.value;
      if (!shell) return;

      await nextTick();

      state.width = props.designWidth;
      state.height = props.designHeight;

      if (!state.originalWidth || !state.originalHeight) {
        state.originalWidth = shell.clientWidth;
        state.originalHeight = shell.clientHeight;
      }
    };

    const updateDimensions = (): void => {
      const wrapper = hudWrapperEl.value;
      if (!wrapper) return;

      wrapper.style.width = `${state.width}px`;
      wrapper.style.height = `${state.height}px`;
    };

    /* ============================================================
     * HUD 缩放 + Engine 裁剪核心逻辑
     * ============================================================ */

    const autoScale = (s: number): void => {
      const shell = shellEl.value;
      const wrapper = hudWrapperEl.value;
      if (!shell || !wrapper) return;

      const cw = shell.clientWidth;
      const ch = shell.clientHeight;

      const dw = wrapper.clientWidth;
      const dh = wrapper.clientHeight;

      wrapper.style.transform =
        props.scaleMode === "none" ? "none" : `scale(${s}, ${s})`;

      const mx = Math.max((cw - dw * s) / 2, 0);
      const my = Math.max((ch - dh * s) / 2, 0);

      wrapper.style.margin = `${my}px ${mx}px`;

      viewportLayout.left = mx;
      viewportLayout.top = my;
      viewportLayout.width = dw * s;
      viewportLayout.height = dh * s;
    };

    const updateScale = (): void => {
      const shell = shellEl.value;
      const wrapper = hudWrapperEl.value;
      if (!shell || !wrapper) return;

      const cw = shell.clientWidth;
      const ch = shell.clientHeight;

      const rw = state.width || state.originalWidth;
      const rh = state.height || state.originalHeight;
      if (rw <= 0 || rh <= 0) return;

      const sx = cw / rw;
      const sy = ch / rh;

      if (props.fullScreen) {
        const fx = props.allowUpscale ? sx : Math.min(1, sx);
        const fy = props.allowUpscale ? sy : Math.min(1, sy);

        wrapper.style.transform =
          props.scaleMode === "none" ? "none" : `scale(${fx}, ${fy})`;
        wrapper.style.margin = "0px";

        viewportLayout.left = 0;
        viewportLayout.top = 0;
        viewportLayout.width = cw;
        viewportLayout.height = ch;

        scale.value = Math.min(fx, fy);
        syncContext(cw, ch);
        return;
      }

      const raw = Math.min(sx, sy);
      const finalScale = props.allowUpscale ? raw : Math.min(1, raw);

      scale.value = props.scaleMode === "none" ? 1 : finalScale;
      autoScale(scale.value);
      syncContext(cw, ch);
    };

    /* ============================================================
     * resize 监听
     * ============================================================ */

    const refresh = async (): Promise<void> => {
      await initializeDimensions();
      updateDimensions();
      updateScale();
    };

    const onResize = debounce(() => {
      void refresh();
    }, props.delay);

    let ro: ResizeObserver | null = null;

    onMounted(() => {
      void (async () => {
        await refresh();

        const shell = shellEl.value;
        if (shell) {
          ro = new ResizeObserver(() => onResize());
          ro.observe(shell);
        }

        window.addEventListener("resize", onResize);
      })();
    });

    onBeforeUnmount(() => {
      onResize.cancel();
      window.removeEventListener("resize", onResize);

      if (ro && shellEl.value) ro.unobserve(shellEl.value);
      ro = null;
    });

    watch(
      () => [
        props.designWidth,
        props.designHeight,
        props.fullScreen,
        props.allowUpscale,
        props.scaleMode,
      ] as const,
      () => void refresh()
    );

    /* ============================================================
     * 样式计算
     * ============================================================ */

    const shellStyle = computed<CSSProperties>(() => ({
      position: "relative",
      width: "100%",
      height: "100%",
      overflow: "hidden",
      ...props.shellStyle,
    }));

    const engineViewportStyle = computed<CSSProperties>(() => ({
      position: "absolute",
      left: `${viewportLayout.left}px`,
      top: `${viewportLayout.top}px`,
      width: `${viewportLayout.width}px`,
      height: `${viewportLayout.height}px`,
      overflow: "hidden",
      zIndex: 0,
      transform: "none", // 红线：Engine 不允许 transform
      transitionProperty: "left, top, width, height",
      transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
      transitionDuration: "500ms",
    }));

    const hudWrapperStyle = computed<CSSProperties>(() => ({
      position: "relative",
      overflow: "hidden",
      zIndex: 100,
      transformOrigin: "left top",
      transitionProperty: "all",
      transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
      transitionDuration: "500ms",
      ...props.wrapperStyle,
    }));

    /* ============================================================
     * 渲染
     * ============================================================ */

    return () => (
      <section ref={shellEl} class="ad-screen-shell" style={shellStyle.value}>
        {/* Engine 视口：只显示 HUD 覆盖的区域 */}
        <div
          ref={engineViewportEl}
          class="ad-screen-shell__engine-viewport"
          style={engineViewportStyle.value}
        >
          {slots.engine?.()}
        </div>

        {/* HUD 覆盖层 */}
        <div class="ad-screen-shell__hud-overlay">
          <div
            ref={hudWrapperEl}
            class="ad-screen-shell__hud-wrapper"
            style={hudWrapperStyle.value}
          >
            {slots.hud?.()}
          </div>
        </div>
      </section>
    );
  },
});
