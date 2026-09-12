CREATE TYPE "EmailStatus" AS ENUM ('SCHEDULED', 'PROCESSING', 'SENT', 'FAILED');

CREATE TABLE "User" (
	"id" TEXT NOT NULL,
	"googleId" TEXT,
	"email" TEXT NOT NULL,
	"name" TEXT NOT NULL,
	"avatar" TEXT,
	"slackAccessToken" TEXT,
	"slackTeamId" TEXT,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL,
	CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
	"id" TEXT NOT NULL,
	"userId" TEXT NOT NULL,
	"expiresAt" TIMESTAMP(3) NOT NULL,
	CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Campaign" (
	"id" TEXT NOT NULL,
	"userId" TEXT NOT NULL,
	"subject" TEXT NOT NULL,
	"body" TEXT NOT NULL,
	"senderEmail" TEXT NOT NULL,
	"senderName" TEXT,
	"startAt" TIMESTAMP(3) NOT NULL,
	"delayMs" INTEGER NOT NULL,
	"hourlyLimit" INTEGER NOT NULL,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmailJob" (
	"id" TEXT NOT NULL,
	"campaignId" TEXT NOT NULL,
	"userId" TEXT NOT NULL,
	"recipient" TEXT NOT NULL,
	"subject" TEXT NOT NULL,
	"body" TEXT NOT NULL,
	"senderEmail" TEXT NOT NULL,
	"scheduledAt" TIMESTAMP(3) NOT NULL,
	"sentAt" TIMESTAMP(3),
	"status" "EmailStatus" NOT NULL DEFAULT 'SCHEDULED',
	"attempts" INTEGER NOT NULL DEFAULT 0,
	"messageId" TEXT,
	"previewUrl" TEXT,
	"lastError" TEXT,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL,
	CONSTRAINT "EmailJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RateLimitEvent" (
	"id" TEXT NOT NULL,
	"senderKey" TEXT NOT NULL,
	"hourWindow" TEXT NOT NULL,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "RateLimitEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "EmailJob_userId_status_idx" ON "EmailJob"("userId", "status");
CREATE INDEX "EmailJob_scheduledAt_idx" ON "EmailJob"("scheduledAt");
CREATE INDEX "EmailJob_recipient_idx" ON "EmailJob"("recipient");
CREATE UNIQUE INDEX "RateLimitEvent_senderKey_hourWindow_key" ON "RateLimitEvent"("senderKey", "hourWindow");

ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey"
	FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_userId_fkey"
	FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailJob" ADD CONSTRAINT "EmailJob_campaignId_fkey"
	FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailJob" ADD CONSTRAINT "EmailJob_userId_fkey"
	FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
