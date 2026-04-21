---
title: Uber Shaderと個別シェーダーの比較（Three.jsハンズオン）
description: Three.jsでUber Shader方式と個別シェーダー方式を実装し、コードレベルで比較するハンズオン
pubDate: 2026-04-21
updatedDate: 2026-04-21
---

## ゴール

Three.jsで同じ見た目要件（色 + テクスチャ + リムライト）を、次の2方式で実装して比較します。

- **Uber Shader方式**: 1つのShaderMaterialで機能をフラグ切り替え
- **個別シェーダー方式**: 用途別にShaderMaterialを分ける

## 前提環境

- Node.js 20+ 
- Three.js r160+
- Vite などESMで動く環境

## 1. プロジェクト作成

```bash
npm create vite@latest threejs-shader-compare -- --template vanilla
cd threejs-shader-compare
npm install three
npm run dev
```

`src/main.js` を以下の流れで作成します。

- シーン・カメラ・レンダラー初期化
- 球体メッシュを2つ配置
- 左: Uber Shader / 右: 個別シェーダー

## 2. 共通の初期化コード

```js
import * as THREE from "three";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a1a);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0, 4);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

const geometry = new THREE.SphereGeometry(0.8, 64, 64);
const texture = new THREE.TextureLoader().load("/uv-grid.png");

const uniformsBase = {
  uColor: { value: new THREE.Color("#66ccff") },
  uTexture: { value: texture },
  uUseTexture: { value: true },
  uUseRim: { value: true },
  uRimPower: { value: 2.5 },
  uCameraPos: { value: camera.position.clone() }
};
```

## 3. Uber Shader方式（1本で切り替え）

### Vertex Shader

```glsl
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vPosW;

void main() {
  vUv = uv;
  vNormalW = normalize(normalMatrix * normal);
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vPosW = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
```

### Fragment Shader

```glsl
uniform vec3 uColor;
uniform sampler2D uTexture;
uniform bool uUseTexture;
uniform bool uUseRim;
uniform float uRimPower;
uniform vec3 uCameraPos;

varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vPosW;

void main() {
  vec3 baseColor = uColor;

  if (uUseTexture) {
    baseColor *= texture2D(uTexture, vUv).rgb;
  }

  if (uUseRim) {
    vec3 viewDir = normalize(uCameraPos - vPosW);
    float rim = pow(1.0 - max(dot(vNormalW, viewDir), 0.0), uRimPower);
    baseColor += vec3(0.6, 0.8, 1.0) * rim * 0.6;
  }

  gl_FragColor = vec4(baseColor, 1.0);
}
```

### Material作成

```js
const uberMaterial = new THREE.ShaderMaterial({
  uniforms: THREE.UniformsUtils.clone(uniformsBase),
  vertexShader: uberVertex,
  fragmentShader: uberFragment
});
```

## 4. 個別シェーダー方式（用途別に分離）

ここでは2種類に分割します。

- `textureOnlyFragment`: テクスチャ合成のみ
- `textureRimFragment`: テクスチャ + リムライト

### 例: textureRimFragment

```glsl
uniform vec3 uColor;
uniform sampler2D uTexture;
uniform float uRimPower;
uniform vec3 uCameraPos;

varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vPosW;

void main() {
  vec3 tex = texture2D(uTexture, vUv).rgb;
  vec3 baseColor = uColor * tex;

  vec3 viewDir = normalize(uCameraPos - vPosW);
  float rim = pow(1.0 - max(dot(vNormalW, viewDir), 0.0), uRimPower);
  baseColor += vec3(0.6, 0.8, 1.0) * rim * 0.6;

  gl_FragColor = vec4(baseColor, 1.0);
}
```

### Material作成

```js
const splitMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uColor: { value: new THREE.Color("#66ccff") },
    uTexture: { value: texture },
    uRimPower: { value: 2.5 },
    uCameraPos: { value: camera.position.clone() }
  },
  vertexShader: uberVertex,
  fragmentShader: textureRimFragment
});
```

## 5. 比較用に同時表示

```js
const left = new THREE.Mesh(geometry, uberMaterial);
left.position.x = -1.1;
scene.add(left);

const right = new THREE.Mesh(geometry, splitMaterial);
right.position.x = 1.1;
scene.add(right);

function tick() {
  requestAnimationFrame(tick);
  left.rotation.y += 0.01;
  right.rotation.y += 0.01;

  uberMaterial.uniforms.uCameraPos.value.copy(camera.position);
  splitMaterial.uniforms.uCameraPos.value.copy(camera.position);

  renderer.render(scene, camera);
}
tick();
```

## 6. ハンズオンで見るべき差分

### A. 機能追加（例: ノイズ）

- Uber: `uUseNoise` と `if (uUseNoise)` を追記
- 個別: 必要なシェーダーだけにノイズ版を追加

### B. デバッグ

- Uber: 分岐条件の組み合わせ確認が必要
- 個別: 対象シェーダーを1つ見ればよい

### C. パフォーマンス確認

- Chrome DevTools の WebGL/Performance でフレーム時間を比較
- 条件分岐を増やしたUberと、軽量な個別版を同条件で比較

## 7. 結論（Three.js実装観点）

- **Uber Shader向き**: マテリアル設定を統一したい、機能の再利用を優先したい
- **個別シェーダー向き**: 機能差が大きい、軽量化やデバッグ容易性を優先したい
- 実務では、**共通部分はUber / 特殊表現は個別** のハイブリッドが扱いやすいです。

まずは本記事の2メッシュ比較を動かし、機能追加時の変更行数・確認工数・FPS差を記録すると、チームに合う設計方針を決めやすくなります。
