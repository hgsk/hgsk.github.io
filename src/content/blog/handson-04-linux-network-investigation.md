---
title: 04. ネットワーク層観測
description: IP、ルーティング、DNS、ポート監視の基本確認
pubDate: 2026-04-21
updatedDate: 2026-05-30
---

## 実行コマンド一覧

*「このマシンは<punch-line>どこと繋がっているか</punch-line>」を、ネットワーク層ごとに確認する。通信というものを理解するための最初の一歩は、このマシンの「見えている世界」を把握することである。*

```bash
ip a
ip route
ss -tulpen
cat /etc/resolv.conf
nslookup example.com
traceroute example.com
```

## 出力解読指針

*各コマンドの出力が示す<punch-line>ネットワーク構造の意味</punch-line>を押さえる。出力を「暗号のようなもの」として眺める者は、ネットワークの勘所を一生掴めない。*

- `ip a`: NICごとのIPアドレス
- `ip route`: デフォルトゲートウェイ
- `ss -tulpen`: LISTENポートとPID
- `resolv.conf`: DNSサーバー設定

---

*文責: hyt*
