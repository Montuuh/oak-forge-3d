-- CreateEnum
CREATE TYPE "BacklogStatus" AS ENUM ('pending', 'in_progress', 'done', 'cancelled');
CREATE TYPE "BacklogPriority" AS ENUM ('low', 'medium', 'high');

-- CreateTable
CREATE TABLE "backlog_tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "status" "BacklogStatus" NOT NULL DEFAULT 'pending',
    "priority" "BacklogPriority" NOT NULL DEFAULT 'medium',
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "backlog_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "backlog_tasks_status_idx" ON "backlog_tasks"("status");
CREATE INDEX "backlog_tasks_priority_idx" ON "backlog_tasks"("priority");
CREATE INDEX "backlog_tasks_category_idx" ON "backlog_tasks"("category");
CREATE INDEX "backlog_tasks_status_priority_idx" ON "backlog_tasks"("status", "priority");
