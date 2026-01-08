import { shallowRef, type ShallowRef } from 'vue'
import { createWorldTerrainAsync, Viewer } from 'cesium'

/**
 * Cesium Viewer 单例（策略一：全局复用）
 * - 任何地方都通过该 hook 获取同一个 Viewer
 * - 只允许第一次创建时传入容器与 options
 */
let viewerSingleton: Viewer | null = null

export type UseCesiumViewer = Readonly<{
  viewer: ShallowRef<Viewer | null>
  /**
   * 初始化（仅首次会创建；后续调用会复用）
   */
  init: (container: HTMLElement, options?: Viewer.ConstructorOptions) => Promise<Viewer>
  /**
   * 触发 resize（由 AdCesiumHost 的 ResizeObserver 调用）
   */
  resize: () => void
  /**
   * 可选销毁（一般大屏不销毁，保持单例）
   */
  destroy: () => void
}>

const viewerRef: ShallowRef<Viewer | null> = shallowRef<Viewer | null>(null)

export function useCesiumViewer(): UseCesiumViewer {
  const init = async (
    container: HTMLElement,
    options?: Viewer.ConstructorOptions,
  ): Promise<Viewer> => {
    if (viewerSingleton) {
      // 复用单例：确保 canvas 在正确容器里
      // Cesium Viewer 的 container 不能随便改，这里采用“组件层只负责挂载容器”
      viewerRef.value = viewerSingleton
      return viewerSingleton
    }

    // 如果你有 Cesium ion token，在这里设置（可选）
    // Ion.defaultAccessToken = "YOUR_TOKEN";

    const viewer = new Viewer(container, {
      animation: false,
      timeline: false,
      fullscreenButton: false,
      geocoder: false,
      homeButton: false,
      navigationHelpButton: false,
      sceneModePicker: false,
      selectionIndicator: false,
      infoBox: false,
      baseLayerPicker: true,
      ...options,
    })

    // 地形（可选）：没有 token/网络限制时可注释掉
    try {
      viewer.terrainProvider = await createWorldTerrainAsync()
    } catch {
      // 忽略：无 token 或网络失败也不影响“看到地球”
    }

    viewerSingleton = viewer
    viewerRef.value = viewer
    return viewer
  }

  const resize = (): void => {
    const v = viewerRef.value
    if (!v) return
    // Cesium 会根据容器真实像素更新 canvas
    v.resize()
    // 如果你启用了 requestRenderMode，可以补一行 requestRender
    // v.scene.requestRender();
  }

  const destroy = (): void => {
    if (!viewerSingleton) return
    viewerSingleton.destroy()
    viewerSingleton = null
    viewerRef.value = null
  }

  return { viewer: viewerRef, init, resize, destroy }
}
