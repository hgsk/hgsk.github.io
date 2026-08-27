---
title: 03. ファイルシステム解析
description: ディレクトリ構造、権限、マウント情報の確認
pubDate: 2026-04-21
updatedDate: 2026-05-30
---

## 実行コマンド一覧

*Linux のディレクトリ構造と権限の実態を、<punch-line>自分の目で確かめる。</punch-line>教科書の図解で「こうなっている」と信じる者は、一度でも実機の出力を見たことがない者である。*

```bash
pwd
ls -la /
ls -la /etc
ls -la /var/log
find /etc -maxdepth 1 -type f | head
stat /etc/hosts
mount | head
```

## 出力解読指針

*それぞれのコマンドが<punch-line>「何のために存在するか」</punch-line>を対応づける。コマンドの存在理由を無視して、単なる呪文として覚える者は、何かを構築するたびに破綻する。*

- `/etc`: 設定ファイル
- `/var/log`: ログ出力
- `stat`: パーミッション・更新時刻
- `mount`: どのデバイス/ボリュームがどこにマウントされているか

---

*文責: hyt*
