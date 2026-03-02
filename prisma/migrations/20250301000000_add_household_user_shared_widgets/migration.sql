-- Add household_user_id to app_config. When set, all widget data is shared under this user.
ALTER TABLE "app_config" ADD COLUMN "household_user_id" TEXT;

-- Set household user to first user (by creation date). All widget data will be shared.
UPDATE "app_config"
SET "household_user_id" = (SELECT id FROM "users" ORDER BY "created_at" ASC LIMIT 1)
WHERE "household_user_id" IS NULL;

-- Migrate all existing widget data to the household user so it becomes shared.
UPDATE "project_todos"
SET "user_id" = (SELECT "household_user_id" FROM "app_config" LIMIT 1)
WHERE (SELECT "household_user_id" FROM "app_config" LIMIT 1) IS NOT NULL;

UPDATE "groceries"
SET "user_id" = (SELECT "household_user_id" FROM "app_config" LIMIT 1)
WHERE (SELECT "household_user_id" FROM "app_config" LIMIT 1) IS NOT NULL;

UPDATE "dinners"
SET "user_id" = (SELECT "household_user_id" FROM "app_config" LIMIT 1)
WHERE (SELECT "household_user_id" FROM "app_config" LIMIT 1) IS NOT NULL;

UPDATE "dinner_rotations"
SET "user_id" = (SELECT "household_user_id" FROM "app_config" LIMIT 1)
WHERE (SELECT "household_user_id" FROM "app_config" LIMIT 1) IS NOT NULL;

UPDATE "budget_income"
SET "user_id" = (SELECT "household_user_id" FROM "app_config" LIMIT 1)
WHERE (SELECT "household_user_id" FROM "app_config" LIMIT 1) IS NOT NULL;

UPDATE "budget_expenses"
SET "user_id" = (SELECT "household_user_id" FROM "app_config" LIMIT 1)
WHERE (SELECT "household_user_id" FROM "app_config" LIMIT 1) IS NOT NULL;
