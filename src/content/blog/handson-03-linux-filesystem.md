---
title: 03. Linuxファイルシステムの調査
description: ディレクトリ構造、権限、マウント情報の確認
pubDate: 2026-04-21
---

## 実行コマンド

```bash
pwd
ls -la /
ls -la /etc
ls -la /var/log
find /etc -maxdepth 1 -type f | head
stat /etc/hosts
mount | head
```

## 読み取りポイント

- `/etc`: 設定ファイル
- `/var/log`: ログ出力
- `stat`: パーミッション・更新時刻
- `mount`: どのデバイス/ボリュームがどこにマウントされているか
