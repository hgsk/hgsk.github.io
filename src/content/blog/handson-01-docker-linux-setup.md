---
title: 01. DockerによるLinux環境構築
description: Ubuntuコンテナを使った再現可能なLinux検証環境の作成
pubDate: 2026-04-21
updatedDate: 2026-05-30
---

## 目標

*本環境を用意することが、<punch-line>以降の全単元の前提</punch-line>となります。ここを省くと何も動きません。*

- Linux検証用コンテナを作る
- 2台のコンテナを起動できる状態にする

## 手順

*Dockerfile を書き、イメージをビルドし、<punch-line>コンテナを2つ起動</punch-line>します。*

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

*2台が<punch-line>同時に稼働していること</punch-line>を、一目で確認します。*

```bash
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
```

---

*文責: hyt*
