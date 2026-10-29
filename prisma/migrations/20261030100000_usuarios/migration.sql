-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN "userId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "userName" TEXT;

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'FRONT_DESK',
    "pinHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sessionVersion" INTEGER NOT NULL DEFAULT 0,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_name_key" ON "User"("name");


-- El PIN único que hubiera pasa a ser el de un usuario «Administración» (mismo PIN, nada cambia al entrar)
INSERT INTO "User" ("id", "name", "role", "pinHash", "active", "sessionVersion", "createdAt", "updatedAt")
SELECT 'usr' || lower(hex(randomblob(10))), 'Administración', 'ADMIN', "pinHash", true, 0,
       CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000
FROM "Settings" WHERE "id" = 1 AND "pinHash" IS NOT NULL;
