---
title: 02. OS内部構造観測
description: カーネル、ディストリ、CPU・メモリ・ディスクを確認する
pubDate: 2026-04-21
updatedDate: 2026-05-30
---

## 実行コマンド一覧

*「今自分が触っているOSは<punch-line>何者か</punch-line>」を、コマンド一本ずつで明らかにしていく。OSというものを、誰かに説明された通りに信じるのは賢明ではなく、自分の目で、自分の指で確かめるのが確実な方法である。*

```bash
uname -a
cat /etc/os-release
lscpu
free -h
df -h
ps aux | head
```

## 出力解読指針

*出力の中で<punch-line>どの数値・行に着目すべきか</punch-line>を押さえておく。コマンドは結果を返す。だが、結果を読めるかどうかは、また別の話である。*

- `uname -a`: カーネルとアーキテクチャ
- `/etc/os-release`: ディストリビューション情報
- `lscpu`: コア数・仮想化情報
- `free -h`: メモリ使用量
- `df -h`: ファイルシステム使用量
- `ps aux`: 稼働プロセス

---

*文責: hyt*
