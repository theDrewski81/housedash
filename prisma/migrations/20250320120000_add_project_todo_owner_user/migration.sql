-- AlterTable
ALTER TABLE "project_todos" ADD COLUMN "owner_user_id" TEXT;

-- AddForeignKey
ALTER TABLE "project_todos" ADD CONSTRAINT "project_todos_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
