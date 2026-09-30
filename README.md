# マウス管理システム（Mice Management System）

実験用マウスの個体・繁殖・ケージ・コンプライアンスを一元管理する Web アプリケーションです。
研究室で Excel やスプレッドシートで行っていたマウス管理を置き換えることを目的に開発しました。

スマートフォンからも操作でき、ケージに貼るタグを QR コード付きで印刷できます。
タグの QR を読み取ると、その個体の詳細ページが直接開きます。

## 主な機能

| 機能 | 概要 |
|---|---|
| 個体管理 | 個体の登録・編集・一覧・検索、QR コードによる個体照会、系統樹（最大4世代）の表示 |
| 系統・サブ系統管理 | 系統ごとのテーマカラー設定、系統内のサブ系統定義、系統担当者の指定 |
| 繁殖管理 | 交配ペアの管理、プラグ確認、出産予定日の自動算出、産子・離乳記録 |
| 離乳処理 | 離乳時に頭数分の個体を自動生成し、両親から系統・サブ系統・遺伝子型を自動継承 |
| ジェノタイピング | PCR 結果（wt/wt・wt/mut・mut/mut）の記録、個体識別法（耳パンチ位置・指カット番号）の管理 |
| タグ印刷 | A4 に 3 列 × 3 行でタグを配置して印刷（1枚 6cm × 7.2cm、QR コード付き） |
| ケージ・ラック管理 | ケージの収容状況モニタリング、ラックへの紐付け |
| コンプライアンス管理 | 動物実験計画書（承認番号・使用可能頭数）の登録と使用実績の記録 |
| 一括登録 | 個体・ジェノタイピング記録をスプレッドシート風 UI でまとめて登録 |
| 掲示板 | 改善要望の収集と対応状況の共有 |
| メール通知 | 出産予定日・離乳予定日を担当者へ自動通知 |
| 多言語対応 | 日本語 / 英語の切り替え |
| アクセス制御 | ユーザーごとに閲覧・操作できる系統を制限 |

## 技術スタック

- **フレームワーク**: Next.js 16（App Router）/ React 19 / TypeScript
- **スタイリング**: Tailwind CSS v4
- **データベース**: SQLite + Prisma ORM
- **認証**: Auth.js（NextAuth v5）— ID / パスワード方式、JWT セッション
- **メール送信**: Nodemailer

## セットアップ

前提：Node.js v18 以上

```bash
# 1. 依存パッケージのインストール
npm install

# 2. 環境変数ファイルの作成
cp .env.example .env

# 3. .env を編集し、AUTH_SECRET を設定
#    生成コマンド: openssl rand -hex 32

# 4. データベースの作成とマイグレーション適用
npx prisma generate
npx prisma migrate deploy

# 5. （任意）デモデータの投入
npm run db:seed

# 6. 開発サーバーの起動
npm run dev
```

`http://localhost:3000` を開くと初回はセットアップ画面が表示され、管理者アカウントを作成できます。

## 環境変数

| 変数 | 必須 | 説明 |
|---|---|---|
| `DATABASE_URL` | ✓ | SQLite のパス（既定値: `file:./dev.db`） |
| `AUTH_SECRET` | ✓ | セッション署名用のシークレット |
| `SMTP_USER` / `SMTP_PASS` | | メール通知の送信元（未設定なら通知はスキップ） |
| `BOARD_NOTIFY_EMAIL` | | 掲示板通知の既定の宛先 |

メール関連は管理画面（`/settings`）からも設定でき、そちらの設定が環境変数より優先されます。

## ドキュメント

[要件定義.md](要件定義.md) に、画面ごとの仕様・データ設計・デザイン仕様・デプロイ手順をまとめています。
機能の詳細や設計判断の背景（なぜその実装にしたか）も記載しています。

## 本番環境の構築例（Oracle Cloud Free Tier）

研究室で常時アクセスできるようにするため、Oracle Cloud の Always Free 枠（無料・時間制限なし）に
デプロイした構成例です。SQLite を使っているのでデータベースサーバーは不要で、1台の VM で完結します。

**構成**：Ubuntu + Node.js 20 + PM2（プロセス常駐）+ Nginx（リバースプロキシ）+ DuckDNS + Let's Encrypt

> Oracle Cloud のコンソール画面は更新されることがあります。以下は「何をするか」を示したもので、
> 画面上の項目名は実際の表示に読み替えてください。

### 1. インスタンスの作成

1. Oracle Cloud にサインアップし、コンパートメント内で「インスタンスの作成」を選ぶ
2. **シェイプ**：Always Free 対象のものを選ぶ
   - `VM.Standard.A1.Flex`（ARM Ampere）：合計 4 OCPU / 24GB RAM まで無料。**こちらを推奨**
     （Next.js の本番ビルドはメモリを使うため、1 OCPU / 6GB 程度は割り当てておくと安定します）
   - `VM.Standard.E2.1.Micro`（AMD）：1 OCPU / 1GB RAM。無料だがビルドがメモリ不足になりやすい
3. **イメージ**：Ubuntu（LTS）
4. **SSH キー**：公開鍵を登録し、秘密鍵（`.key` ファイル）をダウンロードして保管する
   - この秘密鍵は再ダウンロードできません。紛失するとログインできなくなります
   - **リポジトリには絶対にコミットしないでください**（`.gitignore` で `*.key` を除外済み）
5. 作成後、割り当てられた**パブリック IP アドレス**を控える

接続確認：

```bash
chmod 600 <your-ssh-key>.key
ssh -i <your-ssh-key>.key ubuntu@<SERVER_IP>
```

### 2. ポートの開放（2箇所必要 ― つまずきやすい点）

Oracle Cloud の Ubuntu イメージは、**クラウド側のファイアウォールとOS側の iptables の二重**で
通信を遮断しています。片方だけ開けても繋がらないため、両方を設定してください。

**(a) クラウド側：VCN のセキュリティリスト**

インスタンスが属する VCN → サブネット → セキュリティリストで、イングレス規則を追加します。

| ソース CIDR | プロトコル | 宛先ポート | 用途 |
|---|---|---|---|
| `0.0.0.0/0` | TCP | 80 | HTTP（Let's Encrypt の認証にも必要） |
| `0.0.0.0/0` | TCP | 443 | HTTPS |

**(b) OS 側：iptables**

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT

# 再起動後も維持されるように保存する（これを忘れると再起動時に元に戻ります）
sudo apt install -y iptables-persistent
sudo netfilter-persistent save
```

> アプリが動いているのにブラウザから繋がらない場合、ほぼこの (b) が原因です。

### 3. サーバー側のセットアップ

```bash
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PM2（プロセスを常駐させ、再起動後も自動で立ち上げる）
sudo npm install -g pm2

# Nginx
sudo apt install -y nginx
```

### 4. ドメインと HTTPS

IP アドレス直打ちだと HTTPS 証明書が取得できないため、無料のドメインを用意します。

1. [DuckDNS](https://www.duckdns.org/) にログインし、サブドメイン（例：`<your-domain>.duckdns.org`）を作成
2. そのサブドメインに、インスタンスのパブリック IP を登録する
3. Let's Encrypt の証明書を取得する（Nginx の設定も自動で書き換わります）

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d <your-domain>.duckdns.org
```

certbot は更新用のタイマーも自動登録するため、証明書の自動更新の設定は不要です。

### 5. Nginx のリバースプロキシ設定

アプリは `localhost:3000` で動かし、Nginx が外部からの 80/443 を受けて中継します。
`/etc/nginx/sites-available/default` の `server` ブロックに以下を設定します
（certbot 実行後は 443 用のブロックが生成されているので、その中の `location /` を差し替えます）。

```nginx
location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

```bash
sudo nginx -t          # 設定ファイルの検証
sudo systemctl reload nginx
```

### 6. アプリの配置と起動

ローカルからファイルを転送します（Windows の場合、PowerShell の `tar` は Linux の gzip と
互換性がないため**必ず Git Bash で実行**してください）。

```bash
tar -czf - \
  --exclude='*.db' --exclude='*.db-shm' --exclude='*.db-wal' \
  --exclude='node_modules' --exclude='.next' \
  --exclude='.env' --exclude='*.key' \
  --exclude='.git' \
  -C '/path/to' mice-management-system \
  | ssh -i ./<your-ssh-key>.key ubuntu@<SERVER_IP> 'tar -xzf - -C ~/'
```

**除外指定は必ず付けてください。** 特に `.env` を転送すると、サーバー側の `AUTH_SECRET` と
`DATABASE_URL` がローカルの値で上書きされ、全ユーザーのログインセッションが無効化されます。
`DATABASE_URL` のパスが違う場合は、別の DB ファイルを参照して**データが消えたように見えます**。
`*.db` の除外は、サーバー上の本番データベースを上書きしないためです。

サーバー側で初期セットアップと起動：

```bash
ssh -i ./<your-ssh-key>.key ubuntu@<SERVER_IP>
cd ~/mice-management-system

# 環境変数（サーバー側で一度だけ作成する。以降このファイルは転送で上書きしない）
cp .env.example .env
nano .env        # AUTH_SECRET を設定: openssl rand -hex 32

npm install
npx prisma generate
npx prisma migrate deploy
npm run build

# PM2 で常駐させる
pm2 start npm --name mice-mgmt -- start
pm2 save
pm2 startup      # 表示されたコマンドを実行するとOS再起動後も自動起動する
```

`https://<your-domain>.duckdns.org` を開き、初回のセットアップ画面で管理者アカウントを作成します。

### 7. 2回目以降の更新（デプロイ）

**ビルドが失敗したときに稼働中のアプリを落とさないよう、再起動は必ず最後に分けて実行します。**

```bash
# 1. 転送（上記 6. と同じコマンド）

# 2. 依存・マイグレーション・ビルド
ssh -i ./<your-ssh-key>.key ubuntu@<SERVER_IP> 'cd ~/mice-management-system && npm install && npx prisma generate && npx prisma migrate deploy && npm run build'

# 3. ビルド成功を確認してから再起動
ssh -i ./<your-ssh-key>.key ubuntu@<SERVER_IP> 'pm2 restart mice-mgmt && pm2 list'
```

`npx prisma migrate deploy` が `No pending migrations to apply.` と出れば、
スキーマ変更もデータ変換も発生していないことの確認になります。

---

## データの移行

### 既存の管理表（Excel / スプレッドシート）から取り込む

アプリの一括登録画面を使うのが最も簡単で、SQL を書く必要がありません。

1. **系統を先に登録する**（`/strains`）
   個体は系統に紐づくため、最初に系統名・遺伝子背景・テーマカラーを登録します。
   遺伝子背景の欄には、**背景として参照させたい系統の「系統名」と完全に一致する文字列**を
   入力してください（交配相手の候補表示や産子の系統自動判定に使われます）。
2. **ケージ・ラックを登録する**（`/racks`、`/cages`）
3. **個体を一括登録する**（`/mice/bulk`）
   スプレッドシート風の画面で、系統・性別・生年月日などをまとめて入力できます。
   系統を選ぶとマウスIDのプレフィックスと連番が自動で入るため、番号の付け直しが不要です。
   一括変更パネルで、全行に同じ系統・生年月日・ケージをまとめて適用できます。
4. **ジェノタイピング記録を一括登録する**（`/genotyping/bulk`）
   PCR 結果と個体識別法（耳パンチ位置・指カット番号）をまとめて登録します。
5. **親子関係を設定する**
   父・母の欄は既に登録済みの個体から選ぶ形式なので、**世代の古い個体から順に**登録すると
   親を選べる状態になります。

> 登録結果は行ごとに成功（緑）/ 失敗（赤）で色分け表示され、失敗した行だけを修正して
> 再登録できます。一度に全件入れようとせず、10〜20行ずつ試すと原因を切り分けやすいです。

### データを書き出す

`/export` 画面から CSV / Excel 形式でダウンロードできます（系統で絞り込み可能）。
日本語のカラム名で、UTF-8 BOM 付きのため Excel で開いても文字化けしません。
解析用のデータ取り出しや、定期的な記録の保管に使えます。

### ローカル環境 ↔ 本番環境のデータ移行

データベースは SQLite の単一ファイル（`dev.db`）なので、ファイルをコピーするだけで移行できます。

```bash
# 本番 → ローカル（本番データで動作確認したいとき）
scp -i ./<your-ssh-key>.key ubuntu@<SERVER_IP>:~/mice-management-system/dev.db ./dev.db

# ローカル → 本番（初回の投入時のみ。運用開始後は絶対に行わないこと）
scp -i ./<your-ssh-key>.key ./dev.db ubuntu@<SERVER_IP>:~/mice-management-system/dev.db
ssh -i ./<your-ssh-key>.key ubuntu@<SERVER_IP> 'pm2 restart mice-mgmt'
```

**ローカル → 本番の上書きは、運用開始後は行わないでください。**
サーバー上で他のメンバーが入力したデータがすべて失われます。
移行は初回の投入時に限り、以降のデータ追加はアプリの画面から行ってください。

コピー後はマイグレーションの適用状況を揃えておきます。

```bash
npx prisma migrate deploy   # 未適用のマイグレーションがあれば適用される
```

### バックアップ

SQLite ファイルをコピーするだけです。デプロイ前や大きな操作の前に取っておくと安全です。

```bash
ssh -i ./<your-ssh-key>.key ubuntu@<SERVER_IP> \
  'cd ~/mice-management-system && cp -p dev.db ~/dev.db.backup_$(date +%Y%m%d_%H%M%S) && ls -la ~/dev.db.backup_*'
```

cron で定期バックアップにすることもできます（毎日 3:00 に取得し、30日より古いものを削除）。

```bash
# crontab -e で以下を追加
0 3 * * * cd ~/mice-management-system && cp -p dev.db ~/backups/dev.db.$(date +\%Y\%m\%d) && find ~/backups -name 'dev.db.*' -mtime +30 -delete
```

> バックアップはあくまで**取得した時点のスナップショット**です。復元すると、
> それ以降に入力されたデータは失われます。復元前に現在の DB も別名で退避しておいてください。

---

## ライセンス

MIT License

## 補足

このリポジトリは公開用に整理したものです。
実際の運用データ、本番サーバーの接続情報、認証情報は含まれていません。
デプロイ手順に登場するサーバー IP・ドメイン・SSH 鍵名はプレースホルダに置き換えてあります。
