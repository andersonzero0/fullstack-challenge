import { Migration } from '@mikro-orm/migrations'

export class Migration20260622000001 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TYPE "round_status" AS ENUM ('BETTING', 'RUNNING', 'CRASHED');

      CREATE TABLE "rounds" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "status" "round_status" NOT NULL DEFAULT 'BETTING',
        "server_seed" varchar NOT NULL,
        "server_seed_hash" varchar NOT NULL,
        "crash_point" numeric(10,2) NOT NULL,
        "growth_rate" numeric(10,4) NOT NULL,
        "betting_starts_at" timestamptz NOT NULL,
        "betting_ends_at" timestamptz NOT NULL,
        "started_at" timestamptz NULL,
        "crashed_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "rounds_pkey" PRIMARY KEY ("id")
      );

      CREATE TYPE "bet_status" AS ENUM ('PENDING', 'ACTIVE', 'CASHED_OUT', 'LOST', 'REJECTED');

      CREATE TABLE "bets" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "round_id" uuid NOT NULL,
        "player_id" varchar NOT NULL,
        "player_name" varchar NOT NULL,
        "amount" bigint NOT NULL,
        "status" "bet_status" NOT NULL DEFAULT 'PENDING',
        "cashout_multiplier" numeric(10,2) NULL,
        "payout" bigint NULL,
        "auto_cashout_at" numeric(10,2) NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "cashed_out_at" timestamptz NULL,
        CONSTRAINT "bets_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "bets_round_player_unique" UNIQUE ("round_id", "player_id"),
        CONSTRAINT "bets_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds" ("id") ON DELETE CASCADE
      );

      CREATE TABLE "outbox_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "event_type" varchar NOT NULL,
        "payload" jsonb NOT NULL,
        "idempotency_key" varchar NOT NULL,
        "sent" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
      );

      CREATE INDEX "outbox_events_sent_idx" ON "outbox_events" ("sent") WHERE "sent" = false;
    `)
  }

  async down(): Promise<void> {
    this.addSql(`
      DROP TABLE IF EXISTS "outbox_events";
      DROP TABLE IF EXISTS "bets";
      DROP TABLE IF EXISTS "rounds";
      DROP TYPE IF EXISTS "bet_status";
      DROP TYPE IF EXISTS "round_status";
    `)
  }
}
