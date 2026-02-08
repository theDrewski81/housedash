-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'super_user', 'user', 'read_only');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'inactive', 'pending_approval');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "first_name" TEXT,
ADD COLUMN "last_name" TEXT,
ADD COLUMN "role" "UserRole",
ADD COLUMN "status" "UserStatus" DEFAULT 'active';

-- Backfill existing users: active status and user role
UPDATE "users" SET "status" = 'active' WHERE "status" IS NULL;
UPDATE "users" SET "role" = 'user' WHERE "role" IS NULL;

-- CreateTable
CREATE TABLE "app_config" (
    "id" TEXT NOT NULL,
    "allow_account_creation" BOOLEAN NOT NULL DEFAULT false,
    "audit_user_crud" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_log" (
    "id" TEXT NOT NULL,
    "admin_user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_user_id" TEXT,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_audit_log_admin_user_id_idx" ON "admin_audit_log"("admin_user_id");

-- CreateIndex
CREATE INDEX "admin_audit_log_created_at_idx" ON "admin_audit_log"("created_at");

-- AddForeignKey
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
