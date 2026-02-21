-- CreateTable
CREATE TABLE "dinner_rotations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "meal_name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dinner_rotations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dinner_rotations_user_id_idx" ON "dinner_rotations"("user_id");

-- AddForeignKey
ALTER TABLE "dinner_rotations" ADD CONSTRAINT "dinner_rotations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
