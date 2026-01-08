<div align="center">
  <a href="https://github.com/ADuiStuido/adui-screen">
    <img alt="ADui Tools" width="215" src="./public/assets/logo/adui-screen-logo.svg">
  </a>
  <h1>ADui Screen</h1>

  <p align="center">简体中文 | <a href="README_EN.md">English</a></p>

</div>

### ✨ 项目简介

**ADui Screen** 是由 **ADui Studio** 设计并维护的
一个 **工程级、可扩展、长期演进的大屏可视化解决方案**。

它并不是 Demo 项目，也不是 Cesium Demo 封装，而是一个：

* 以 **架构稳定性** 为第一目标
* 以 **渲染引擎可替换** 为核心设计思想
* 适合 **复杂大屏系统 / 多页面 / 长时间运行** 的前端框架

> 当前唯一渲染引擎实现为 **CesiumJS**，
> 但 **Cesium 并不是架构核心**。



### 🎯 设计目标

* **引擎独立（Engine-Oriented）**

    * 架构不绑定任何具体渲染引擎
    * Cesium 只是当前实现

* **大屏稳定性**

    * 禁止通过 `transform: scale()` 解决渲染问题
    * 保证拾取、交互、坐标计算的真实性

* **工程可维护性**

    * 清晰的分层
    * 明确的职责边界
    * 可预测的生命周期

* **长期演进**

    * 支持功能与引擎的渐进扩展
    * 不因新增需求推翻既有架构



### 🧱 架构概览

```
Application（应用层）
│
├─ UI / Layout（Ad Components）
│
├─ Screen Shell（大屏壳）
│
├─ Hooks 能力层
│
├─ Engine Adapter（引擎适配）
│
└─ Rendering Engine（CesiumJS - 当前）
```

> **渲染引擎是实现细节，而不是系统中心。**



### 🧩 核心组件（必须存在）

| 组件                 | 说明                           |
|--------------------|------------------------------|
| **AdAppLayout**    | 应用级布局（菜单 / 顶栏 / 内容区）         |
| **AdScreenShell**  | 大屏壳：HUD 可 scale，渲染引擎不 scale  |
| **AdCesiumHost**   | Cesium 容器，仅负责 mount + resize |



### 🪝 Cesium 使用原则（强约束）

* Cesium Viewer **全局单例复用**
* 页面组件 **禁止直接操作 Cesium API**
* 所有 Cesium 能力必须通过 **Hooks** 提供
* Cesium 容器：

    * ❌ 禁止 `transform: scale()` / `zoom`
    * ✅ 使用 `ResizeObserver + viewer.resize()`



### 🧠 Hooks 规范

* `useCesiumViewer`：Viewer 单例管理
* `useCesiumLayerGroup`：页面级图层隔离与自动清理
* `useCesiumCamera` / `useCesiumPick` / `useCesiumEvents`

> 页面只使用 hooks，不直接接触引擎。



### 🛠 技术栈

* Vue 3 + Composition API
* `<script setup>`
* TypeScript（严格模式，零 any）
* Vite
* CesiumJS（当前引擎实现）



### 🚫 明确禁止的行为

* 每个页面 `new Cesium.Viewer`
* UI 与 Cesium 强耦合
* 使用 scale 解决 Cesium 自适应
* 在页面组件中直接写 Cesium 逻辑
* 非 Cesium 页面 import Cesium

### 🏷️ 项目定位总结

> **ADui Screen 是一个“架构先行”的大屏可视化解决方案，
> 而不是某个引擎的 UI 外壳。**