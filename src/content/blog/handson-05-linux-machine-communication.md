---
title: 05. Linuxマシン同士の通信
description: 同一Dockerネットワーク上での疎通とパケット観察
pubDate: 2026-04-21
---

## 準備

```bash
docker network create handson-net
docker network connect handson-net linux-lab-1
docker network connect handson-net linux-lab-2
```

## 疎通確認

`linux-lab-1` 側IPを確認:

```bash
ip a
```

`linux-lab-2` 側からPing:

```bash
ping -c 4 <linux-lab-1のIP>
```

## パケット観察

```bash
tcpdump -i any icmp
```
