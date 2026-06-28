-- CreateTable
CREATE TABLE "LogImportHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "job_name" TEXT NOT NULL,
    "started_at" DATETIME NOT NULL,
    "completed_at" DATETIME,
    "status" TEXT NOT NULL,
    "message" TEXT
);
