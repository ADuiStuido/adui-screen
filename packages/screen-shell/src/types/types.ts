/**
 * HUD 缩放策略：
 * - fit/contain：等比缩放，完整显示（默认）
 * - cover：等比缩放，铺满容器，允许裁切
 * - width：按宽度缩放（高度可能溢出）
 * - height：按高度缩放（宽度可能溢出）
 * - none：不缩放 HUD（仍然保留分层结构与尺寸信息）
 */
export type AdScreenScaleMode =
  | "fit"
  | "contain"
  | "cover"
  | "width"
  | "height"
  | "none";

/**
 * AdScreenShell 对外暴露的上下文信息：
 * - scale：当前 HUD 的缩放倍数（引擎层不缩放）
 * - designWidth/designHeight：设计稿尺寸（通常 1920x1080）
 * - containerWidth/containerHeight：壳容器的实时像素尺寸
 *
 * 注意：
 * - 这里的 containerWidth/Height 是“真实像素尺寸”
 * - 引擎层（Cesium）必须使用真实像素渲染，不允许 transform scale
 */
export interface AdScreenShellContext {
  scale: number;
  designWidth: number;
  designHeight: number;
  containerWidth: number;
  containerHeight: number;

  /**
   * HUD 缩放层内的浮层挂载点：
   * - 适合：希望弹出层随 HUD 一起缩放的场景
   * - 示例：设计稿像素对齐的下拉菜单、tooltip
   */
  overlayRootScaledEl: HTMLElement | null;

  /**
   * HUD 非缩放浮层挂载点：
   * - 适合：希望弹出层按真实像素显示（更清晰、交互更稳定）
   * - 推荐：默认将 UI 组件库的 Teleport/Portal 指向这里
   */
  overlayRootUnscaledEl: HTMLElement | null;
}
