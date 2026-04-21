---
title: 01. DockerによるLinux環境構築
description: Ubuntuコンテナを使った再現可能なLinux検証環境の作成
pubDate: 2026-04-21
---

## 目標

- Linux検証用コンテナを作る
- 2台のコンテナを起動できる状態にする

## 手順

```bash
mkdir linux-net-handson && cd linux-net-handson
```

`Dockerfile` を作成します。

```dockerfile
FROM ubuntu:24.04
RUN apt-get update && apt-get install -y \
  iproute2 iputils-ping net-tools dnsutils traceroute \
  curl wget tcpdump procps lsof vim && \
  rm -rf /var/lib/apt/lists/*
WORKDIR /work
CMD ["bash"]
```

ビルドして2台起動します。

```bash
docker build -t linux-lab .
docker run --rm -it --name linux-lab-1 linux-lab
docker run --rm -it --name linux-lab-2 linux-lab
```

## 確認

```bash
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
```
