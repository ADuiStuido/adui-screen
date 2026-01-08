import { inject } from "vue";
import type { InjectionKey, Ref } from "vue";
import type { AdScreenShellContext } from "../types";

/**
 * 注入 Key：
 * - 由 AdScreenShell 组件 provide
 * - 由 useAdScreenShell 消费
 *
 * 使用 Ref 包裹是为了让 context 在 ResizeObserver 更新时保持响应式。
 */
export const AdScreenShellKey: InjectionKey<Ref<AdScreenShellContext>> =
  Symbol("AdScreenShellKey");

/**
 * 获取 AdScreenShell 的上下文信息。
 *
 * 约束：
 * - 必须在 <AdScreenShell> 组件树内部调用
 * - 如果外部调用，会抛出明确错误，避免 silent failure
 */
export function useAdScreenShell(): Ref<AdScreenShellContext> {
  const ctx = inject(AdScreenShellKey);
  if (!ctx) {
    throw new Error(
      "[AdScreenShell] Missing provider. Make sure you are inside <AdScreenShell>.",
    );
  }
  return ctx;
}
