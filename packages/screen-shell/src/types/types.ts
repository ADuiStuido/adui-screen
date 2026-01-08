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
  readonly scale: number;
  readonly designWidth: number;
  readonly designHeight: number;
  readonly containerWidth: number;
  readonly containerHeight: number;
}
