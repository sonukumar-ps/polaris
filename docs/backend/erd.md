# Polaris Database ERD

This diagram is generated from the Supabase migrations in `supabase/migrations`.
It covers every application table plus the Supabase-managed tables the app depends on:
`auth.users`, `storage.buckets`, and `storage.objects`.

## Domain Map

```mermaid
flowchart LR
  user["Auth user"] --> profile["Profile"]
  profile --> accounts["Trading accounts"]
  profile --> tags["Journal tags"]
  profile --> trades["Trades"]
  profile --> snapshots["Daily account snapshots"]
  accounts --> trades
  accounts --> snapshots
  assets["Shared asset catalog"] --> trades
  trades --> tradeTags["Trade tag links"]
  tags --> tradeTags
  trades --> images["Trade image metadata"]
  images --> storage["Private Storage objects"]

  classDef owner fill:#e8f3ff,stroke:#007aff,stroke-width:2px,color:#102033;
  classDef journal fill:#f7f7f5,stroke:#6e6e73,color:#1d1d1f;
  classDef ref fill:#eef9f0,stroke:#30d158,color:#102414;
  classDef storage fill:#fff4e5,stroke:#ff9f0a,color:#2c1f07;

  class user,profile owner;
  class accounts,trades,tags,tradeTags,snapshots journal;
  class assets ref;
  class images,storage storage;
```

## Entity Relationship Diagram

```mermaid
erDiagram
  AUTH_USERS ||--|| PROFILES : "creates"
  PROFILES ||--o{ ACCOUNTS : "owns"
  PROFILES ||--o{ TRADES : "logs"
  PROFILES ||--o{ TAGS : "defines"
  PROFILES ||--o{ TRADE_IMAGES : "uploads"
  PROFILES ||--o{ DAILY_ACCOUNT_SNAPSHOTS : "records"
  ACCOUNTS ||--o{ TRADES : "contains"
  ACCOUNTS ||--o{ DAILY_ACCOUNT_SNAPSHOTS : "has daily equity"
  ASSETS ||--o{ TRADES : "is traded in"
  TRADES ||--o{ TRADE_TAGS : "is labeled by"
  TAGS ||--o{ TRADE_TAGS : "labels"
  TRADES ||--o{ TRADE_IMAGES : "has screenshots"
  STORAGE_BUCKETS ||--o{ STORAGE_OBJECTS : "stores"
  TRADE_IMAGES }o--|| STORAGE_OBJECTS : "points to storage_path"

  AUTH_USERS {
    uuid id PK
    jsonb raw_user_meta_data
  }

  PROFILES {
    uuid id PK,FK
    text display_name
    text timezone
    text base_currency
    timestamptz created_at
    timestamptz updated_at
  }

  ACCOUNTS {
    uuid id PK
    uuid user_id FK
    text name
    text broker_name
    text currency
    boolean is_archived
    timestamptz created_at
    timestamptz updated_at
  }

  ASSETS {
    uuid id PK
    text symbol
    text name
    asset_class asset_class
    text exchange
    text currency
    timestamptz created_at
  }

  TRADES {
    uuid id PK
    uuid user_id FK
    uuid account_id FK
    uuid asset_id FK
    trade_direction direction
    trade_status status
    timestamptz opened_at
    timestamptz closed_at
    numeric entry_price
    numeric exit_price
    numeric quantity
    numeric fees
    numeric gross_pnl
    numeric net_pnl
    numeric risk_amount
    numeric r_multiple
    text notes
    timestamptz created_at
    timestamptz updated_at
  }

  TAGS {
    uuid id PK
    uuid user_id FK
    text name
    tag_type type
    text color
    timestamptz created_at
  }

  TRADE_TAGS {
    uuid trade_id PK,FK
    uuid tag_id PK,FK
    timestamptz created_at
  }

  TRADE_IMAGES {
    uuid id PK
    uuid user_id FK
    uuid trade_id FK
    text storage_path
    text caption
    timestamptz created_at
  }

  DAILY_ACCOUNT_SNAPSHOTS {
    uuid id PK
    uuid user_id FK
    uuid account_id FK
    date snapshot_date
    numeric equity
    numeric cash_balance
    numeric realized_pnl
    timestamptz created_at
  }

  STORAGE_BUCKETS {
    text id PK
    text name
    boolean public
  }

  STORAGE_OBJECTS {
    uuid id PK
    text bucket_id FK
    text name
  }
```

## How To Read It

- `auth.users` is the identity source. A database trigger creates one `profiles` row for each new auth user.
- `profiles` is the ownership root for user-private data. Accounts, trades, tags, images, and snapshots all trace back to it for RLS.
- `accounts` groups trades and daily equity snapshots for a user.
- `assets` is shared reference data. Authenticated users can read and insert assets, but assets are not owned by one profile.
- `trades` is the central journal record. It belongs to one profile, one account, and one asset.
- `tags` are user-owned labels. `trade_tags` is the many-to-many join table between trades and tags.
- `trade_images` stores metadata for screenshots attached to trades. The actual file lives in Supabase Storage.
- `daily_account_snapshots` captures account equity over time for dashboard and future analytics.

## Constraints And Ownership Rules

| Area | Rule |
| --- | --- |
| Profile identity | `profiles.id` references `auth.users.id` and cascades on user deletion. |
| User data ownership | User-owned rows carry `user_id` back to `profiles.id`. |
| Account cleanup | Deleting a profile deletes accounts; deleting an account deletes its trades and snapshots. |
| Trade cleanup | Deleting a trade deletes its tag links and image metadata. |
| Asset reuse | `assets` are unique by `(symbol, asset_class, exchange)` and survive trade deletion. |
| Tag reuse | `tags` are unique by `(user_id, type, name)`. |
| Snapshot uniqueness | `daily_account_snapshots` is unique by `(account_id, snapshot_date)`. |
| Closed trade integrity | Closed trades must have both `closed_at` and `exit_price`. |
| Screenshot storage | Storage object paths are scoped under the authenticated user's folder in the private `trade-images` bucket. |

## Enums

| Enum | Values |
| --- | --- |
| `trade_direction` | `long`, `short` |
| `trade_status` | `open`, `closed`, `cancelled` |
| `asset_class` | `stock`, `option`, `future`, `forex`, `crypto`, `other` |
| `tag_type` | `strategy`, `emotion`, `mistake`, `setup`, `session`, `custom` |
