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


/**
 * 严格类型 debounce（不依赖 lodash）
 * - 适用于 resize/observer 高频触发场景
 * - 提供 cancel，组件卸载时必须清理
 */
type Debounced = {
  (): void;
  cancel: () => void;
};

function debounce(fn: () => void, delayMs: number): Debounced {
  let timer: number | null = null;

  const d = (): void => {
    if (timer !== null) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = null;
      fn();
    }, delayMs);
  };

  d.cancel = (): void => {
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
  };

  return d;
}

/**
 * AdScreenShell（TSX 完整版）
 *
 * ✅ 核心模型（你要求的）：
 * - HUD：像“遮罩/面板”，按设计稿尺寸布局；允许缩放与居中（transform scale + margin）
 * - Engine：不再全屏；只渲染在 HUD 缩放后占据的可视矩形区域（EngineViewport）
 *
 * ✅ 硬约束（ADui Screen 红线）：
 * - Engine 层（Cesium 容器/canvas）绝对禁止 transform/scale/zoom
 * - HUD 缩放必须与 Engine 解耦：Engine 通过改变容器尺寸实现“只渲染在可视区域”
 *
 * ✅ 稳定性策略：
 * - ResizeObserver 监听壳容器真实尺寸变化
 * - window.resize 兜底（某些环境 RO 触发不及时）
 * - 防抖减少抖动
 */
export const AdScreenShell = defineComponent({
  name: "AdScreenShell",

  props: {
    /** 设计稿宽度（例如 1920） */
    designWidth: { type: Number, default: 1920 },

    /** 设计稿高度（例如 1080） */
    designHeight: { type: Number, default: 1080 },

    /**
     * 是否铺满（非等比缩放）
     * - true：HUD 使用 scale(sx, sy) 直接铺满壳容器
     * - false：HUD 等比缩放，取 min 比例 + margin 居中
     */
    fullScreen: { type: Boolean, default: false },

    /**
     * resize 防抖延迟（ms）
     * - 参照你给的模型：默认 500 更平滑
     */
    delay: { type: Number, default: 500 },

    /**
     * HUD 缩放模式（保留扩展）
     * - 当前行为主要由 fullScreen 控制
     * - scaleMode="none" 时 HUD 不缩放，但仍按设计稿居中
     */
    scaleMode: {
      type: String as PropType<AdScreenScaleMode>,
      default: "fit",
    },

    /**
     * 是否允许放大 HUD（容器 > 设计稿时）
     * - false：最大缩放为 1（只缩小不放大）
     */
    allowUpscale: { type: Boolean, default: true },

    /** 可选：壳根容器样式（不要写 transform） */
    shellStyle: {
      type: Object as PropType<CSSProperties>,
      default: undefined,
    },

    /** 可选：HUD wrapper 额外样式（不要覆盖 transform / margin） */
    wrapperStyle: {
      type: Object as PropType<CSSProperties>,
      default: undefined,
    },
  },

  setup(props, { slots }) {
    /**
     * 壳根容器：用于测量“真实可用空间”
     * - 你可以把它当成 bn-screen
     */
    const shellEl = ref<HTMLElement | null>(null);

    /**
     * HUD wrapper：承载 HUD 内容，按设计稿尺寸布局，执行 scale 和 margin
     * - 你可以把它当成 bn-screen__wrapper
     */
    const hudWrapperEl = ref<HTMLElement | null>(null);

    /**
     * EngineViewport：引擎渲染区域容器
     * - 关键：它的 left/top/width/height 跟随 HUD 缩放后矩形
     * - 引擎（Cesium）挂载在这里，永远真实像素
     */
    const engineViewportEl = ref<HTMLElement | null>(null);

    /**
     * 状态：参照你给的 state（但不使用 window.screen）
     * - originalWidth/originalHeight：首次记录壳容器尺寸（比 window.screen 更可靠）
     * - width/height：设计稿尺寸（来自 props）
     */
    const state = reactive({
      originalWidth: 0,
      originalHeight: 0,
      width: 0,
      height: 0,
    });

    /**
     * 统一缩放值（等比场景下的 scale）
     * - fullScreen 非等比时，我们也会给一个“代表性 scale”（取 min(sx, sy)）
     * - 业务如果需要非等比精确值，可后续扩展 context
     */
    const uniformScale = ref<number>(1);

    /**
     * 可视矩形布局：HUD 缩放后的最终矩形（用于 EngineViewport）
     * - left/top：在壳容器内的偏移
     * - width/height：缩放后的最终宽高
     */
    const viewportLayout = reactive({
      left: 0,
      top: 0,
      width: 0,
      height: 0,
    });

    /**
     * 对外 provide：Shell 上下文（保持引用不变，只更新字段）
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
     * 同步上下文（只更新字段，避免整体替换）
     */
    const syncContext = (containerW: number, containerH: number): void => {
      contextRef.value = {
        scale: uniformScale.value,
        designWidth: props.designWidth,
        designHeight: props.designHeight,
        containerWidth: containerW,
        containerHeight: containerH,
      };
    };

    /**
     * 初始化尺寸：参照你给的 initializeDimensions
     * - 设计稿尺寸来自 props
     * - original 尺寸来自壳容器首次测量值（不是 window.screen）
     */
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

    /**
     * updateDimensions：给 HUD wrapper 设置设计稿宽高
     * - 让 HUD 内部组件以“设计稿像素坐标”布局
     */
    const updateDimensions = (): void => {
      const wrapper = hudWrapperEl.value;
      if (!wrapper) return;

      wrapper.style.width = `${state.width}px`;
      wrapper.style.height = `${state.height}px`;
    };

    /**
     * autoScale（等比缩放场景）：
     * - wrapper transform scale(s,s)
     * - 计算 margin 居中
     * - 同步 viewportLayout 给 EngineViewport
     *
     * 注意：EngineViewport 不做 transform，只改变自己的 left/top/width/height
     */
    const autoScale = (scale: number): void => {
      const shell = shellEl.value;
      const wrapper = hudWrapperEl.value;
      if (!shell || !wrapper) return;

      const domWidth = wrapper.clientWidth;
      const domHeight = wrapper.clientHeight;

      const currentWidth = shell.clientWidth;
      const currentHeight = shell.clientHeight;

      // HUD：只缩放 HUD wrapper
      wrapper.style.transform = props.scaleMode === "none" ? "none" : `scale(${scale},${scale})`;

      // 居中：完全照你的参考模型（margin）
      const mx = Math.max((currentWidth - domWidth * scale) / 2, 0);
      const my = Math.max((currentHeight - domHeight * scale) / 2, 0);

      wrapper.style.margin = `${my}px ${mx}px`;

      // EngineViewport：跟随 HUD 最终矩形（注意这里是“缩放后的宽高”）
      viewportLayout.left = mx;
      viewportLayout.top = my;
      viewportLayout.width = domWidth * scale;
      viewportLayout.height = domHeight * scale;
    };

    /**
     * updateScale：参照你给的 updateScale
     * - fullScreen=true：非等比铺满
     * - fullScreen=false：等比缩放 + autoScale 居中
     *
     * 额外增强：
     * - allowUpscale=false：最大缩放 1
     * - 真实尺寸使用 shell.clientWidth/Height（不要 document.body）
     */
    const updateScale = (): void => {
      const shell = shellEl.value;
      const wrapper = hudWrapperEl.value;
      if (!shell || !wrapper) return;

      const currentWidth = shell.clientWidth;
      const currentHeight = shell.clientHeight;

      const realWidth = state.width || state.originalWidth;
      const realHeight = state.height || state.originalHeight;
      if (realWidth <= 0 || realHeight <= 0) return;

      const widthScale = currentWidth / realWidth;
      const heightScale = currentHeight / realHeight;

      // fullScreen：非等比铺满
      if (props.fullScreen) {
        const sx = props.allowUpscale ? widthScale : Math.min(1, widthScale);
        const sy = props.allowUpscale ? heightScale : Math.min(1, heightScale);

        wrapper.style.transform = props.scaleMode === "none" ? "none" : `scale(${sx},${sy})`;
        wrapper.style.margin = "0px";

        // EngineViewport：铺满整个壳容器
        viewportLayout.left = 0;
        viewportLayout.top = 0;
        viewportLayout.width = currentWidth;
        viewportLayout.height = currentHeight;

        // 对外 scale：给一个代表值（等比业务通常只认一个 scale）
        uniformScale.value = props.scaleMode === "none" ? 1 : Math.min(sx, sy);
        syncContext(currentWidth, currentHeight);
        return;
      }

      // 非 fullScreen：等比缩放，取 min 比例
      const raw = Math.min(widthScale, heightScale);
      const s = props.allowUpscale ? raw : Math.min(1, raw);

      uniformScale.value = props.scaleMode === "none" ? 1 : Number.isFinite(s) && s > 0 ? s : 1;

      autoScale(uniformScale.value);
      syncContext(currentWidth, currentHeight);
    };

    /**
     * 统一刷新流程：参照你给的 onResize 逻辑
     */
    const refresh = async (): Promise<void> => {
      await initializeDimensions();
      updateDimensions();
      updateScale();
    };

    /**
     * 防抖 resize：减少频繁触发导致的抖动
     */
    const onResize = debounce((): void => {
      void refresh();
    }, props.delay);

    /**
     * ResizeObserver：监听壳容器尺寸变化（比 window.resize 更准确）
     */
    let ro: ResizeObserver | null = null;

    const addListeners = (): void => {
      window.addEventListener("resize", onResize);
    };

    const removeListeners = (): void => {
      window.removeEventListener("resize", onResize);
    };

    onMounted(() => {
      void (async () => {
        await refresh();

        // 启用 ResizeObserver
        const shell = shellEl.value;
        if (shell) {
          ro = new ResizeObserver(() => {
            onResize();
          });
          ro.observe(shell);
        }

        // window resize 兜底
        addListeners();
      })();
    });

    onBeforeUnmount(() => {
      onResize.cancel();
      removeListeners();

      const shell = shellEl.value;
      if (ro && shell) ro.unobserve(shell);
      ro = null;
    });

    /**
     * props 变化时重算（设计稿/策略变化）
     */
    watch(
      () => [props.designWidth, props.designHeight, props.fullScreen, props.allowUpscale, props.scaleMode] as const,
      () => {
        void refresh();
      }
    );

    /**
     * 样式：参照你给的 wrapper 样式模型
     */
    const shellStyle = computed<CSSProperties>(() => ({
      position: "relative",
      width: "100%",
      height: "100%",
      overflow: "hidden",
      ...props.shellStyle,
    }));

    /**
     * EngineViewport 样式：
     * - 关键：只改变 left/top/width/height，不使用 transform
     * - overflow hidden：裁掉 HUD 可视区域外的部分（让 Engine 只显示“面板窗口”）
     */
    const engineViewportStyle = computed<CSSProperties>(() => ({
      position: "absolute",
      left: `${viewportLayout.left}px`,
      top: `${viewportLayout.top}px`,
      width: `${viewportLayout.width}px`,
      height: `${viewportLayout.height}px`,
      zIndex: 0,
      overflow: "hidden",

      // ✅ 红线：依然不允许 transform
      transform: "none",

      // ✅ 跟 HUD 同步的过渡（只对布局属性）
      transitionProperty: "left, top, width, height",
      transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
      transitionDuration: "500ms",
    }));

    /**
     * HUD overlay：覆盖整个壳容器
     * - HUD wrapper 自己用 margin/scale 占据中间区域（或 fullScreen 时铺满）
     */
    const hudOverlayStyle: CSSProperties = {
      position: "absolute",
      inset: 0,
      zIndex: 10,
      pointerEvents: "auto",
    };

    /**
     * HUD wrapper 样式：
     * - 完全照你的参考写法（transition / relative / overflow / zIndex / origin）
     * - 具体的 transform/margin 会在 updateScale/autoScale 中动态写入 DOM style
     *
     * 为什么 transform/margin 不放 computed？
     * - 因为你参考的实现就是“直接写 DOM style”，并且在 fullScreen/autoScale 两套逻辑里更直观
     * - 同时避免频繁触发 TSX 重新渲染导致性能抖动
     */
    const hudWrapperBaseStyle = computed<CSSProperties>(() => ({
      transitionProperty: "all",
      transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
      transitionDuration: "500ms",
      position: "relative",
      overflow: "hidden",
      zIndex: 100,
      transformOrigin: "left top",
      ...props.wrapperStyle,
    }));

    /**
     * 渲染结构：
     * - EngineViewport：只渲染 HUD 可视矩形（你要的“HUD 像遮罩”效果）
     * - HUD overlay：在上层，负责面板/UI
     */
    return () => (
      <section ref={shellEl} class="ad-screen-shell" style={shellStyle.value}>
        {/* 引擎视口：只占 HUD 留下的窗口区域（不全屏） */}
        <div ref={engineViewportEl} class="ad-screen-shell__engine-viewport" style={engineViewportStyle.value}>
          {slots.engine?.()}
        </div>

        {/* HUD 覆盖层：覆盖全屏，wrapper 自己缩放 + margin 居中 */}
        <div class="ad-screen-shell__hud-overlay" style={hudOverlayStyle}>
          <div ref={hudWrapperEl} class="ad-screen-shell__hud-wrapper" style={hudWrapperBaseStyle.value}>
            {slots.hud?.()}
          </div>
        </div>
      </section>
    );
  },
});
