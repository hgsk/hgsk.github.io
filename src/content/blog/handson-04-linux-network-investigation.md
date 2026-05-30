---
title: 04. Linuxネットワークの調査
description: IP、ルーティング、DNS、ポート監視の基本確認
pubDate: 2026-04-21
updatedDate: 2026-05-30
---

## 実行コマンド

*「このマシンは<punch-line>どこと繋がっているか</punch-line>」を、ネットワーク層ごとに確認します。*

```bash
ip a
ip route
ss -tulpen
cat /etc/resolv.conf
nslookup example.com
traceroute example.com
```

## 読み取りポイント

*各コマンドの出力が示す<punch-line>ネットワーク構造の意味</punch-line>を押さえます。*

- `ip a`: NICごとのIPアドレス
- `ip route`: デフォルトゲートウェイ
- `ss -tulpen`: LISTENポートとPID
- `resolv.conf`: DNSサーバー設定
