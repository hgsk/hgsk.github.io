---
title: 04. Linuxネットワークの調査
description: IP、ルーティング、DNS、ポート監視の基本確認
pubDate: 2026-04-21
---

## 実行コマンド

```bash
ip a
ip route
ss -tulpen
cat /etc/resolv.conf
nslookup example.com
traceroute example.com
```

## 読み取りポイント

- `ip a`: NICごとのIPアドレス
- `ip route`: デフォルトゲートウェイ
- `ss -tulpen`: LISTENポートとPID
- `resolv.conf`: DNSサーバー設定
