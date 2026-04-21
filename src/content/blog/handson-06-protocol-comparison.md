---
title: 06. 通信プロトコルの比較
description: HTTP、WebSocket、gRPC、生TCPの特徴比較
pubDate: 2026-04-21
---

## 比較表

| プロトコル | 方向 | データ形式 | 主用途 |
| --- | --- | --- | --- |
| HTTP/1.1 | 基本は片方向（Req/Res） | テキスト中心(JSON) | Web API |
| WebSocket | 双方向 | テキスト/バイナリ | チャット・ゲーム |
| gRPC | 双方向ストリーミング可 | Protocol Buffers | サービス間通信 |
| 生TCP | 実装依存 | 実装依存 | 独自プロトコル |

## 評価観点

- レイテンシ
- 実装難易度
- スキーマ管理
- デバッグ容易性
