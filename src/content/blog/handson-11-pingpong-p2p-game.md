---
title: 11. Ping PongのリアルタイムP2P通信対戦ゲームの製作
description: 入力同期型のP2P対戦ゲームを段階的に実装する
pubDate: 2026-04-21
updatedDate: 2026-05-30
---

## 最小構成

*いきなり完成系を目指さず、<punch-line>動く最小単位から始めます。</punch-line>マッチメイクと対戦通信を分離するのがポイントです。*

- マッチメイク: HTTP API
- 対戦通信: WebSocket または TCP
- 権威ノード: ルームオーナー（暫定）

## データモデル例

*ゲームの状態を表すデータ構造を定義します。これが<punch-line>ネットワーク越しに送受信される単位</punch-line>になります。*

```csharp
public record PlayerInput(int Frame, bool Up, bool Down);
public record BallState(float X, float Y, float Vx, float Vy);
public record GameState(int Frame, float PaddleA, float PaddleB, BallState Ball, int ScoreA, int ScoreB);
```

## 固定Tickゲームループ（60fps）

*フレームレートを固定し、毎フレームの処理を<punch-line>一定の順序で実行</punch-line>します。遅延は Task.Delay で吸収します。*

```csharp
const int TickMs = 16;
var frame = 0;

while (true)
{
    var start = DateTime.UtcNow;

    // 1. 入力適用
    // 2. 衝突判定
    // 3. スコア更新
    // 4. スナップショット送信

    frame++;
    var elapsed = (int)(DateTime.UtcNow - start).TotalMilliseconds;
    var delay = Math.Max(0, TickMs - elapsed);
    await Task.Delay(delay);
}
```

## 同期戦略

*入力とスナップショットの2種類を組み合わせて、<punch-line>通信量と整合性のバランス</punch-line>を取ります。*

1. 毎フレームは入力イベントを送信
2. 5〜10フレームごとに状態スナップショット送信
3. 差分が閾値を超えたら補正（スナップ）

## 検証

*実際の遅延・パケットロス環境でゲームが壊れないかを確認します。<punch-line>数字で検証できる項目を先に決めておく</punch-line>ことが肝要です。*

- 50ms / 100ms 遅延時の操作感
- パケットロス時の復帰
- スコア一致率（両端末）
