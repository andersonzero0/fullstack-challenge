import { Migration } from '@mikro-orm/migrations'

export class Migration20260622000001 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE "wallets" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "player_id" varchar NOT NULL,
        "balance" bigint NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "wallets_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "wallets_player_id_unique" UNIQUE ("player_id")
      );

      CREATE TABLE "inbox_events" (
        "idempotency_key" varchar NOT NULL,
        "event_type" varchar NOT NULL,
        "payload" jsonb NOT NULL,
        "processed_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "inbox_events_pkey" PRIMARY KEY ("idempotency_key")
      );
    `)
  }

  async down(): Promise<void> {
    this.addSql(`
      DROP TABLE IF EXISTS "inbox_events";
      DROP TABLE IF EXISTS "wallets";
    `)
  }
}
