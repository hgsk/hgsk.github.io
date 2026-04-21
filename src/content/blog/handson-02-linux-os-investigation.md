---
title: 02. 基礎的なLinuxコマンドによるOSの調査
description: カーネル、ディストリ、CPU・メモリ・ディスクを確認する
pubDate: 2026-04-21
---

## 実行コマンド

```bash
uname -a
cat /etc/os-release
lscpu
free -h
df -h
ps aux | head
```

## 読み取りポイント

- `uname -a`: カーネルとアーキテクチャ
- `/etc/os-release`: ディストリビューション情報
- `lscpu`: コア数・仮想化情報
- `free -h`: メモリ使用量
- `df -h`: ファイルシステム使用量
- `ps aux`: 稼働プロセス
