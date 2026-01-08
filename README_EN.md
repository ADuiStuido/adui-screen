<div align="center">
  <a href="https://github.com/ADuiStuido/adui-screen">
    <img alt="ADui Tools" width="215" src="./public/assets/logo/adui-screen-logo.svg">
  </a>
  <h1>ADui Screen</h1>

  <p align="center"><a href="README.md">简体中文</a> | English</p>

</div>

### ✨ Introduction

**ADui Screen** is an **engine-oriented, long-term maintained large-screen visualization framework**
designed and maintained by **ADui Studio**.

It is **not a demo project**, nor a simple Cesium wrapper.
Instead, it is built for:

* Complex large-screen systems
* Multiple pages & menus
* Long-running visualization applications

> CesiumJS is the **current rendering engine implementation**,
> but **it is not the architectural core**.



### 🎯 Design Goals

* **Engine Independence**

    * Architecture is not bound to any specific rendering engine
    * Cesium is replaceable

* **Large-Screen Stability**

    * No CSS scaling hacks
    * Accurate picking, interaction, and spatial calculations

* **Maintainability**

    * Clear layer responsibilities
    * Predictable lifecycles
    * Team-friendly architecture

* **Incremental Evolution**

    * New features without breaking the foundation
    * Future engines can be added safely



### 🧱 Architecture Overview

```
Application Layer
│
├─ UI / Layout Layer
│
├─ Screen Shell
│
├─ Hooks Capability Layer
│
├─ Engine Adapter Layer
│
└─ Rendering Engine (CesiumJS - current)
```

> **The rendering engine is an implementation detail, not the center of the system.**



### 🧩 Core Components

| Component         | Description                                 |
|-------------------|---------------------------------------------|
| **AdAppLayout**   | Application-level layout                    |
| **Index** | Screen shell (HUD can scale, engine cannot) |
| **AdCesiumHost**  | Cesium mount & resize container             |



### 🪝 Cesium Rules (Strict)

* **Single Cesium Viewer instance**
* No direct Cesium API usage in pages
* All Cesium logic must go through hooks
* Cesium container:

    * ❌ No `transform: scale()` / `zoom`
    * ✅ Real pixel rendering + `ResizeObserver`



### 🧠 Hooks

* `useCesiumViewer`
* `useCesiumLayerGroup`
* `useCesiumCamera`
* `useCesiumPick`
* `useCesiumEvents`

Pages consume hooks, **never the engine directly**.



### 🛠 Tech Stack

* Vue 3 (Composition API)
* `<script setup>`
* TypeScript (strict, no `any`)
* Vite
* CesiumJS (current engine)



### 🚫 Anti-Patterns

* Creating a Viewer per page
* Coupling UI with Cesium
* Scaling Cesium with CSS
* Writing Cesium logic in page components
* Importing Cesium in non-Cesium pages



### 📄 Documents

* **Architecture**: `ARCHITECTURE.md`
* **AI Usage Guidelines**: `团队 AI 使用规范（ADui Screen）.md`



### 🏷️ Summary

> **ADui Screen treats rendering engines as replaceable tools,
> not architectural dependencies.**
