---
title: 02. 基礎的なLinuxコマンドによるOSの調査
description: カーネル、ディストリ、CPU・メモリ・ディスクを確認する
pubDate: 2026-04-21
updatedDate: 2026-05-30
---

## 実行コマンド

*「今自分が触っているOSは何者か」を、コマンド一本ずつで明らかにしていきます。*

```bash
uname -a
cat /etc/os-release
lscpu
free -h
df -h
ps aux | head
```

## 読み取りポイント

*出力の中でどの数値・行に着目すべきかを押さえておきます。*

- `uname -a`: カーネルとアーキテクチャ
- `/etc/os-release`: ディストリビューション情報
- `lscpu`: コア数・仮想化情報
- `free -h`: メモリ使用量
- `df -h`: ファイルシステム使用量
- `ps aux`: 稼働プロセス
