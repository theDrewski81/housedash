-- AlterTable
ALTER TABLE "user_preferences" ADD COLUMN "projects_config" JSONB;

-- CreateEnum
CREATE TYPE "ProjectTodoStatus" AS ENUM ('NOT_READY', 'STARTING', 'IN_PROGRESS', 'COMPLETE');

-- CreateTable
CREATE TABLE "project_todos" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "initial_priority" INTEGER,
    "status" "ProjectTodoStatus" NOT NULL DEFAULT 'NOT_READY',
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_todos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_todos_user_id_status_idx" ON "project_todos"("user_id", "status");

-- AddForeignKey
ALTER TABLE "project_todos" ADD CONSTRAINT "project_todos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
