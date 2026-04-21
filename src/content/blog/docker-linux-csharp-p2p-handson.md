---
title: dockerによるLinux環境構築、基礎的なLinuxコマンドによるOSの調査、Linuxファイルシステム、Linuxネットワークの調査、Linuxマシン同士の通信、通信プロトコルの比較、TCP上のRPCによるP2Pエコー、C#によるHTTPサーバーの構築、C#によるWebSocketサーバーの構築、C#によるgRPC APIサーバーの構築、Ping PongのリアルタイムP2P通信対戦ゲームの製作
description: Docker上のLinux調査からC#サーバー実装とP2P対戦ゲームまでを一気通貫で学ぶハンズオン
pubDate: 2026-04-21
---

# はじめに

このハンズオンでは、Dockerで作ったLinux環境を調査しながら、ネットワーク通信の基礎を確認し、最後にC#で実装したHTTP/WebSocket/gRPCとP2P通信を使って「Ping Pong」対戦ゲームを作ります。

## ゴール

- Dockerで再現可能なLinux検証環境を作る
- Linux OS/ファイルシステム/ネットワークの基本調査ができる
- TCP・WebSocket・gRPCの違いを説明できる
- C#でHTTP/WebSocket/gRPCサーバーを作れる
- P2Pのリアルタイム対戦（Ping Pong）を完成できる

## 前提

- Docker / Docker Compose が利用可能
- .NET SDK 8 以降が利用可能
- ターミナルの基本操作ができる

---

## 1. DockerによるLinux環境構築

まずは作業ディレクトリを作成します。

```bash
mkdir linux-net-handson && cd linux-net-handson
```

`Dockerfile` を作成します。

```dockerfile
FROM ubuntu:24.04
RUN apt-get update && apt-get install -y \
    iproute2 iputils-ping net-tools dnsutils traceroute curl wget tcpdump \
    procps lsof vim && \
    rm -rf /var/lib/apt/lists/*
WORKDIR /work
CMD ["bash"]
```

ビルドと起動を行います。

```bash
docker build -t linux-lab .
docker run --rm -it --name linux-lab-1 linux-lab
```

別端末でもう1台起動して、後段の相互通信に使います。

```bash
docker run --rm -it --name linux-lab-2 linux-lab
```

---

## 2. 基礎的なLinuxコマンドによるOSの調査

コンテナ内で以下を実行し、OS情報を確認します。

```bash
uname -a
cat /etc/os-release
lscpu
free -h
df -h
ps aux | head
```

確認ポイント:

- カーネルバージョン
- ディストリビューション情報
- CPU/メモリ/ディスク容量
- 動作中プロセス

---

## 3. Linuxファイルシステムの調査

```bash
pwd
ls -la /
ls -la /etc
ls -la /var/log
find /etc -maxdepth 1 -type f | head
stat /etc/hosts
mount | head
```

確認ポイント:

- `/`, `/etc`, `/var`, `/home`, `/tmp` の役割
- 設定ファイル・ログファイルの配置
- パーミッションと所有者

---

## 4. Linuxネットワークの調査

```bash
ip a
ip route
ss -tulpen
cat /etc/resolv.conf
nslookup example.com
traceroute example.com
```

確認ポイント:

- NICのIPアドレス
- デフォルトゲートウェイ
- LISTENしているポート
- DNS解決の流れ

---

## 5. Linuxマシン同士の通信

2つのコンテナを同一ネットワークに接続します。

```bash
docker network create handson-net
docker network connect handson-net linux-lab-1
docker network connect handson-net linux-lab-2
```

`linux-lab-1` 側でIPを確認:

```bash
ip a
```

`linux-lab-2` 側から疎通確認:

```bash
ping -c 4 <linux-lab-1のIP>
```

必要に応じて `tcpdump -i any icmp` でパケット観察します。

---

## 6. 通信プロトコルの比較

| プロトコル | 特徴 | 主な用途 |
| --- | --- | --- |
| HTTP/1.1 | リクエスト/レスポンス中心 | Web API, 静的配信 |
| WebSocket | 双方向・常時接続 | チャット, ゲーム |
| gRPC | HTTP/2 + Protocol Buffers | 高速なマイクロサービス間通信 |
| 生TCP | 最小構成で自由度高い | 独自プロトコル, P2P |

比較観点:

- レイテンシ
- メッセージ形式（テキスト/バイナリ）
- 双方向性
- 実装コスト

---

## 7. TCP上のRPCによるP2Pエコー

2ノード間で「文字列を送るとそのまま返る」簡易RPCを作ります。

手順:

1. Peer A: TCP Listener を起動
2. Peer B: TCP Client で接続
3. JSON形式で `{"method":"echo","message":"hello"}` を送信
4. Peer A が `{"result":"hello"}` を返す

実装ポイント:

- メッセージ終端を改行で統一する
- タイムアウトを設定する
- 例外時に接続を安全にクローズする

---

## 8. C#によるHTTPサーバーの構築

```bash
dotnet new web -n HttpServerSample
cd HttpServerSample
```

`Program.cs` で以下のAPIを定義します。

- `GET /health` : `ok` を返す
- `GET /echo?m=...` : クエリ文字列を返す

起動:

```bash
dotnet run
```

確認:

```bash
curl http://localhost:5000/health
curl "http://localhost:5000/echo?m=hello"
```

---

## 9. C#によるWebSocketサーバーの構築

同じASP.NET CoreプロジェクトでWebSocketを有効化し、`/ws` エンドポイントを追加します。

手順:

1. `UseWebSockets()` を設定
2. `/ws` でWebSocketハンドシェイク
3. 受信したテキストをそのまま返す（echo）

確認方法:

- `wscat` などのクライアントで接続
- 複数クライアント同時接続で双方向性を確認

---

## 10. C#によるgRPC APIサーバーの構築

```bash
dotnet new grpc -n GrpcServerSample
cd GrpcServerSample
```

`echo.proto` を作成し、`EchoService` を実装します。

- `rpc Echo(EchoRequest) returns (EchoReply)`

確認:

- `grpcurl` または自作C#クライアントで呼び出し
- 同じメッセージが返ることを確認

---

## 11. Ping PongのリアルタイムP2P通信対戦ゲームの製作

### 構成

- マッチメイク: HTTP API
- ゲーム中通信: WebSocket または 生TCP
- 状態同期: ルームオーナーを一時的な権威ノードにする

### 最小仕様

- 2人対戦
- パドル上下移動
- ボール反射
- スコア管理（先取5点など）
- 再戦機能

### 実装ステップ

1. ルーム作成/参加APIをHTTPで実装
2. P2P接続情報（IP/Port/SessionId）を交換
3. ゲームループを固定Tickで実装（例: 60fps）
4. 入力イベントのみ送信して遅延を吸収
5. 定期的に状態スナップショットを送って補正
6. 切断時の再接続/勝敗判定を実装

### 検証項目

- 10〜100ms程度の遅延で操作可能か
- パケットロス時に破綻しないか
- 双方でスコアが一致するか

---

## まとめ

このハンズオンを通じて、Linux調査からネットワーク通信、C#サーバー実装、P2Pリアルタイムゲーム制作までを一連で体験できました。次の発展としては、NAT越え（STUN/TURN）、入力予測、リプレイ保存、チート対策の導入がおすすめです。
