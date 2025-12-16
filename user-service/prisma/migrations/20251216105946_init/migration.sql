-- CreateTable
CREATE TABLE "User" (
    "uuid" TEXT NOT NULL PRIMARY KEY,
    "player_tag" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_player_tag_key" ON "User"("player_tag");
