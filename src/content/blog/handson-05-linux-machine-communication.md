---
title: 05. コンテナ間通信実験
description: 同一Dockerネットワーク上での疎通とパケット観察
pubDate: 2026-04-21
updatedDate: 2026-05-30
---

## 事前準備

*2台のコンテナを同一ネットワークに接続し、<punch-line>互いを見つけられる状態</punch-line>にします。*

```bash
docker network create handson-net
docker network connect handson-net linux-lab-1
docker network connect handson-net linux-lab-2
```

## 疎通確認

*ping で到達性を確認します。応答があれば、<punch-line>IPレイヤーで繋がっています。</punch-line>*

`linux-lab-1` 側IPを確認:

```bash
ip a
```

`linux-lab-2` 側からPing:

```bash
ping -c 4 <linux-lab-1のIP>
```

## パケット観察

*実際にやりとりされているパケットを目視し、<punch-line>通信が抽象ではなく物理的な事実</punch-line>であることを確認します。*

```bash
tcpdump -i any icmp
```

---

*文責: hyt*
