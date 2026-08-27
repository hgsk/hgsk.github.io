---
title: 05. コンテナ間通信実験
description: 同一Dockerネットワーク上での疎通とパケット観察
pubDate: 2026-04-21
updatedDate: 2026-05-30
hero: /hero-handson-05-linux-machine-communication.svg
---

## 事前準備

*2台のコンテナを同一ネットワークに接続し、<punch-line>互いを見つけられる状態</punch-line>にします。
通信が始まる前に、まず「相手が存在する」ことを成立させておくのが、準備の本質なのかもしれません。*

```bash
docker network create handson-net
docker network connect handson-net linux-lab-1
docker network connect handson-net linux-lab-2
```

## 疎通確認

*ping で到達性を確認します。
応答があれば、<punch-line>IPレイヤーで繋がっている</punch-line>ことになります。
この「応答が返る」という単純な事実を当たり前だと思ってしまうと、通信障害のときに気づきにくくなる気がします。*

`linux-lab-1` 側の IP を確認します。

```bash
ip a
```

`linux-lab-2` 側から Ping を打ちます。

```bash
ping -c 4 <linux-lab-1のIP>
```

## パケット観察

*実際にやりとりされているパケットを目視し、<punch-line>通信が抽象ではなく物理的な事実</punch-line>であることを確認します。
ネットワークの世界では、証拠はパケットなのかもしれません。*

```bash
tcpdump -i any icmp
```

---

*文責: hyt*
