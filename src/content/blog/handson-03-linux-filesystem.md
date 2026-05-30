---
title: 03. Linuxファイルシステムの調査
description: ディレクトリ構造、権限、マウント情報の確認
pubDate: 2026-04-21
updatedDate: 2026-05-30
---

## 実行コマンド

*Linux のディレクトリ構造と権限の実態を、<punch-line>自分の目で確かめます。</punch-line>*

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

*それぞれのコマンドが<punch-line>「何のために存在するか」</punch-line>を対応づけます。*

- `/etc`: 設定ファイル
- `/var/log`: ログ出力
- `stat`: パーミッション・更新時刻
- `mount`: どのデバイス/ボリュームがどこにマウントされているか

---

*文責: hyt*
