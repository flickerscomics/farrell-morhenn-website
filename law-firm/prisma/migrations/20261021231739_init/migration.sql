-- CreateEnum
CREATE TYPE "SessionKind" AS ENUM ('STAFF', 'CLIENT');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('MANAGING_PARTNER', 'PARTNER', 'SENIOR_ATTORNEY', 'ASSOCIATE_ATTORNEY', 'PARALEGAL', 'LEGAL_CLERK', 'INVESTIGATOR', 'OFFICE_MANAGER', 'RECEPTIONIST', 'ADMINISTRATIVE');

-- CreateEnum
CREATE TYPE "StaffStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'INACTIVE', 'DEPARTED');

-- CreateEnum
CREATE TYPE "ArticleType" AS ENUM ('ANNOUNCEMENT', 'LEGAL_ARTICLE', 'RECRUITMENT', 'COMMUNITY', 'CASE_ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('NEW', 'UNDER_REVIEW', 'AWAITING_INFORMATION', 'AWAITING_CLIENT_RESPONSE', 'CONSULTATION_REQUESTED', 'ACCEPTED', 'DECLINED', 'CLOSED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'DECLINED');

-- CreateEnum
CREATE TYPE "MatterStatus" AS ENUM ('INTAKE', 'CONFLICT_CHECK_PENDING', 'AWAITING_ENGAGEMENT', 'ACTIVE', 'AWAITING_CLIENT', 'AWAITING_HEARING', 'ON_HOLD', 'CONCLUDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MatterEventType" AS ENUM ('UPDATE', 'HEARING', 'DEADLINE', 'FILING', 'MEETING', 'MILESTONE');

-- CreateEnum
CREATE TYPE "VacancyStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('RECEIVED', 'UNDER_REVIEW', 'INTERVIEW', 'OFFERED', 'HIRED', 'UNSUCCESSFUL', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "UploadVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "UploadPurpose" AS ENUM ('PORTRAIT', 'LOGO', 'ARTICLE_IMAGE', 'GENERAL_IMAGE', 'ENQUIRY_ATTACHMENT', 'APPLICATION_ATTACHMENT', 'MATTER_DOCUMENT', 'CLIENT_UPLOAD');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('STAFF', 'CLIENT', 'PUBLIC', 'SYSTEM');

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "permissions" TEXT[],
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "staffProfileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientAccount" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "characterName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "kind" "SessionKind" NOT NULL,
    "userId" TEXT,
    "clientAccountId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT,
    "clientAccountId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "firmName" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "logoId" TEXT,
    "colorPrimary" TEXT NOT NULL DEFAULT '#15233b',
    "colorAccent" TEXT NOT NULL DEFAULT '#a8864f',
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "addressLines" TEXT[],
    "locationNote" TEXT NOT NULL DEFAULT '',
    "officeHours" JSONB NOT NULL,
    "socialLinks" JSONB NOT NULL,
    "navigation" JSONB NOT NULL,
    "footerText" TEXT NOT NULL DEFAULT '',
    "heroEyebrow" TEXT NOT NULL DEFAULT '',
    "heroTitle" TEXT NOT NULL,
    "heroText" TEXT NOT NULL,
    "homeSections" JSONB NOT NULL,
    "contactMethods" TEXT[],
    "consultationTypes" TEXT[],
    "enquiryNotice" TEXT NOT NULL DEFAULT '',
    "defaultAssigneeId" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Los_Angeles',
    "slotMinutes" INTEGER NOT NULL DEFAULT 30,
    "minNoticeHours" INTEGER NOT NULL DEFAULT 12,
    "maxAdvanceDays" INTEGER NOT NULL DEFAULT 60,
    "appointmentMinutes" INTEGER NOT NULL DEFAULT 45,
    "acceptingEnquiries" BOOLEAN NOT NULL DEFAULT true,
    "acceptingBookings" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL DEFAULT '',
    "sections" JSONB NOT NULL DEFAULT '[]',
    "metaDescription" TEXT NOT NULL DEFAULT '',
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffProfile" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL,
    "portraitId" TEXT,
    "shortBio" TEXT NOT NULL DEFAULT '',
    "biography" TEXT NOT NULL DEFAULT '',
    "background" TEXT NOT NULL DEFAULT '',
    "qualifications" TEXT NOT NULL DEFAULT '',
    "barAdmissions" TEXT NOT NULL DEFAULT '',
    "languages" TEXT[],
    "notableCases" TEXT NOT NULL DEFAULT '',
    "achievements" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "acceptsConsultations" BOOLEAN NOT NULL DEFAULT false,
    "isLeadership" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "status" "StaffStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "joinedYear" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeArea" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "overview" TEXT NOT NULL DEFAULT '',
    "matterTypes" TEXT[],
    "services" TEXT[],
    "intakeFields" JSONB NOT NULL DEFAULT '[]',
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metaDescription" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ArticleCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" "ArticleType" NOT NULL DEFAULT 'LEGAL_ARTICLE',
    "categoryId" TEXT,
    "tags" TEXT[],
    "authorId" TEXT,
    "featuredImageId" TEXT,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "metaDescription" TEXT NOT NULL DEFAULT '',
    "sourceMatterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaqCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FaqCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faq" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "categoryId" TEXT,
    "practiceAreaId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Faq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enquiry" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "characterName" TEXT NOT NULL,
    "contactDetails" TEXT NOT NULL DEFAULT '',
    "preferredContact" TEXT NOT NULL DEFAULT '',
    "practiceAreaId" TEXT,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "preferredAttorneyId" TEXT,
    "preferredDate" TEXT NOT NULL DEFAULT '',
    "preferredTime" TEXT NOT NULL DEFAULT '',
    "intakeData" JSONB NOT NULL DEFAULT '[]',
    "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "assignedToId" TEXT,
    "followUpAt" TIMESTAMP(3),
    "matterId" TEXT,
    "clientAccountId" TEXT,
    "idempotencyKey" TEXT,
    "contentHash" TEXT NOT NULL,
    "sourceIpHash" TEXT NOT NULL DEFAULT '',
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "characterName" TEXT NOT NULL,
    "contactDetails" TEXT NOT NULL DEFAULT '',
    "preferredContact" TEXT NOT NULL DEFAULT '',
    "attorneyId" TEXT,
    "consultationType" TEXT NOT NULL,
    "requestedStart" TIMESTAMP(3) NOT NULL,
    "alternativeStart" TIMESTAMP(3),
    "scheduledStart" TIMESTAMP(3),
    "durationMinutes" INTEGER NOT NULL DEFAULT 45,
    "reason" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "status" "AppointmentStatus" NOT NULL DEFAULT 'REQUESTED',
    "statusReason" TEXT NOT NULL DEFAULT '',
    "enquiryId" TEXT,
    "matterId" TEXT,
    "handledById" TEXT,
    "clientAccountId" TEXT,
    "idempotencyKey" TEXT,
    "contentHash" TEXT NOT NULL,
    "sourceIpHash" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Matter" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientContact" TEXT NOT NULL DEFAULT '',
    "clientAccountId" TEXT,
    "practiceAreaId" TEXT,
    "leadAttorneyId" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "status" "MatterStatus" NOT NULL DEFAULT 'INTAKE',
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "isRestricted" BOOLEAN NOT NULL DEFAULT false,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "followUpAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Matter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatterMember" (
    "matterId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Support',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatterMember_pkey" PRIMARY KEY ("matterId","userId")
);

-- CreateTable
CREATE TABLE "MatterEvent" (
    "id" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "type" "MatterEventType" NOT NULL DEFAULT 'UPDATE',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "occursAt" TIMESTAMP(3) NOT NULL,
    "isDeadline" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "clientVisible" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatterEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatterMessage" (
    "id" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "senderUserId" TEXT,
    "senderClientId" TEXT,
    "readByStaffAt" TIMESTAMP(3),
    "readByClientAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatterMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "authorId" TEXT,
    "enquiryId" TEXT,
    "matterId" TEXT,
    "appointmentId" TEXT,
    "applicationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vacancy" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department" TEXT NOT NULL DEFAULT '',
    "employmentType" TEXT NOT NULL DEFAULT '',
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "responsibilities" TEXT[],
    "requirements" TEXT[],
    "status" "VacancyStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "closesAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vacancy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "vacancyId" TEXT,
    "desiredRole" TEXT NOT NULL,
    "characterName" TEXT NOT NULL,
    "contactDetails" TEXT NOT NULL DEFAULT '',
    "preferredContact" TEXT NOT NULL DEFAULT '',
    "experience" TEXT NOT NULL,
    "availability" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'RECEIVED',
    "decision" TEXT NOT NULL DEFAULT '',
    "decidedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "idempotencyKey" TEXT,
    "contentHash" TEXT NOT NULL,
    "sourceIpHash" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Upload" (
    "id" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "visibility" "UploadVisibility" NOT NULL,
    "purpose" "UploadPurpose" NOT NULL,
    "altText" TEXT NOT NULL DEFAULT '',
    "clientVisible" BOOLEAN NOT NULL DEFAULT false,
    "uploadedById" TEXT,
    "uploadedByClientId" TEXT,
    "enquiryId" TEXT,
    "applicationId" TEXT,
    "matterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Upload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actorType" "ActorType" NOT NULL,
    "actorId" TEXT,
    "actorLabel" TEXT NOT NULL DEFAULT '',
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitHit" (
    "id" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateLimitHit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceCounter" (
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ReferenceCounter_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "_PracticeAreaToStaffProfile" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PracticeAreaToStaffProfile_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ArticleToPracticeArea" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ArticleToPracticeArea_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_key_key" ON "Role"("key");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_staffProfileId_key" ON "User"("staffProfileId");

-- CreateIndex
CREATE INDEX "User_roleId_idx" ON "User"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientAccount_email_key" ON "ClientAccount"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_clientAccountId_idx" ON "Session"("clientAccountId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Page_slug_key" ON "Page"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "StaffProfile_slug_key" ON "StaffProfile"("slug");

-- CreateIndex
CREATE INDEX "StaffProfile_status_isPublished_idx" ON "StaffProfile"("status", "isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeArea_slug_key" ON "PracticeArea"("slug");

-- CreateIndex
CREATE INDEX "PracticeArea_isPublished_sortOrder_idx" ON "PracticeArea"("isPublished", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleCategory_slug_key" ON "ArticleCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

-- CreateIndex
CREATE INDEX "Article_status_publishedAt_idx" ON "Article"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "Article_type_idx" ON "Article"("type");

-- CreateIndex
CREATE UNIQUE INDEX "FaqCategory_slug_key" ON "FaqCategory"("slug");

-- CreateIndex
CREATE INDEX "Faq_categoryId_sortOrder_idx" ON "Faq"("categoryId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Enquiry_reference_key" ON "Enquiry"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Enquiry_idempotencyKey_key" ON "Enquiry"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Enquiry_status_createdAt_idx" ON "Enquiry"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Enquiry_assignedToId_idx" ON "Enquiry"("assignedToId");

-- CreateIndex
CREATE INDEX "Enquiry_contentHash_createdAt_idx" ON "Enquiry"("contentHash", "createdAt");

-- CreateIndex
CREATE INDEX "Enquiry_followUpAt_idx" ON "Enquiry"("followUpAt");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_reference_key" ON "Appointment"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_idempotencyKey_key" ON "Appointment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Appointment_status_requestedStart_idx" ON "Appointment"("status", "requestedStart");

-- CreateIndex
CREATE INDEX "Appointment_scheduledStart_idx" ON "Appointment"("scheduledStart");

-- CreateIndex
CREATE INDEX "Appointment_contentHash_createdAt_idx" ON "Appointment"("contentHash", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Matter_reference_key" ON "Matter"("reference");

-- CreateIndex
CREATE INDEX "Matter_status_idx" ON "Matter"("status");

-- CreateIndex
CREATE INDEX "Matter_leadAttorneyId_idx" ON "Matter"("leadAttorneyId");

-- CreateIndex
CREATE INDEX "Matter_clientAccountId_idx" ON "Matter"("clientAccountId");

-- CreateIndex
CREATE INDEX "Matter_followUpAt_idx" ON "Matter"("followUpAt");

-- CreateIndex
CREATE INDEX "MatterMember_userId_idx" ON "MatterMember"("userId");

-- CreateIndex
CREATE INDEX "MatterEvent_matterId_occursAt_idx" ON "MatterEvent"("matterId", "occursAt");

-- CreateIndex
CREATE INDEX "MatterEvent_isDeadline_completedAt_occursAt_idx" ON "MatterEvent"("isDeadline", "completedAt", "occursAt");

-- CreateIndex
CREATE INDEX "MatterMessage_matterId_createdAt_idx" ON "MatterMessage"("matterId", "createdAt");

-- CreateIndex
CREATE INDEX "Note_enquiryId_idx" ON "Note"("enquiryId");

-- CreateIndex
CREATE INDEX "Note_matterId_idx" ON "Note"("matterId");

-- CreateIndex
CREATE INDEX "Note_appointmentId_idx" ON "Note"("appointmentId");

-- CreateIndex
CREATE INDEX "Note_applicationId_idx" ON "Note"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "Vacancy_slug_key" ON "Vacancy"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Application_reference_key" ON "Application"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Application_idempotencyKey_key" ON "Application"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Application_status_createdAt_idx" ON "Application"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Application_vacancyId_idx" ON "Application"("vacancyId");

-- CreateIndex
CREATE INDEX "Application_contentHash_createdAt_idx" ON "Application"("contentHash", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Upload_storageKey_key" ON "Upload"("storageKey");

-- CreateIndex
CREATE INDEX "Upload_visibility_purpose_idx" ON "Upload"("visibility", "purpose");

-- CreateIndex
CREATE INDEX "Upload_matterId_idx" ON "Upload"("matterId");

-- CreateIndex
CREATE INDEX "Upload_enquiryId_idx" ON "Upload"("enquiryId");

-- CreateIndex
CREATE INDEX "Upload_applicationId_idx" ON "Upload"("applicationId");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_createdAt_idx" ON "AuditEvent"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_actorId_idx" ON "AuditEvent"("actorId");

-- CreateIndex
CREATE INDEX "RateLimitHit_bucket_keyHash_createdAt_idx" ON "RateLimitHit"("bucket", "keyHash", "createdAt");

-- CreateIndex
CREATE INDEX "_PracticeAreaToStaffProfile_B_index" ON "_PracticeAreaToStaffProfile"("B");

-- CreateIndex
CREATE INDEX "_ArticleToPracticeArea_B_index" ON "_ArticleToPracticeArea"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "StaffProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_clientAccountId_fkey" FOREIGN KEY ("clientAccountId") REFERENCES "ClientAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_clientAccountId_fkey" FOREIGN KEY ("clientAccountId") REFERENCES "ClientAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteSettings" ADD CONSTRAINT "SiteSettings_logoId_fkey" FOREIGN KEY ("logoId") REFERENCES "Upload"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffProfile" ADD CONSTRAINT "StaffProfile_portraitId_fkey" FOREIGN KEY ("portraitId") REFERENCES "Upload"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ArticleCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "StaffProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_featuredImageId_fkey" FOREIGN KEY ("featuredImageId") REFERENCES "Upload"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_sourceMatterId_fkey" FOREIGN KEY ("sourceMatterId") REFERENCES "Matter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Faq" ADD CONSTRAINT "Faq_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FaqCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Faq" ADD CONSTRAINT "Faq_practiceAreaId_fkey" FOREIGN KEY ("practiceAreaId") REFERENCES "PracticeArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_practiceAreaId_fkey" FOREIGN KEY ("practiceAreaId") REFERENCES "PracticeArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_preferredAttorneyId_fkey" FOREIGN KEY ("preferredAttorneyId") REFERENCES "StaffProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_clientAccountId_fkey" FOREIGN KEY ("clientAccountId") REFERENCES "ClientAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "StaffProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clientAccountId_fkey" FOREIGN KEY ("clientAccountId") REFERENCES "ClientAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matter" ADD CONSTRAINT "Matter_clientAccountId_fkey" FOREIGN KEY ("clientAccountId") REFERENCES "ClientAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matter" ADD CONSTRAINT "Matter_practiceAreaId_fkey" FOREIGN KEY ("practiceAreaId") REFERENCES "PracticeArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matter" ADD CONSTRAINT "Matter_leadAttorneyId_fkey" FOREIGN KEY ("leadAttorneyId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterMember" ADD CONSTRAINT "MatterMember_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterMember" ADD CONSTRAINT "MatterMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterEvent" ADD CONSTRAINT "MatterEvent_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterEvent" ADD CONSTRAINT "MatterEvent_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterMessage" ADD CONSTRAINT "MatterMessage_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterMessage" ADD CONSTRAINT "MatterMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterMessage" ADD CONSTRAINT "MatterMessage_senderClientId_fkey" FOREIGN KEY ("senderClientId") REFERENCES "ClientAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_uploadedByClientId_fkey" FOREIGN KEY ("uploadedByClientId") REFERENCES "ClientAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PracticeAreaToStaffProfile" ADD CONSTRAINT "_PracticeAreaToStaffProfile_A_fkey" FOREIGN KEY ("A") REFERENCES "PracticeArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PracticeAreaToStaffProfile" ADD CONSTRAINT "_PracticeAreaToStaffProfile_B_fkey" FOREIGN KEY ("B") REFERENCES "StaffProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ArticleToPracticeArea" ADD CONSTRAINT "_ArticleToPracticeArea_A_fkey" FOREIGN KEY ("A") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ArticleToPracticeArea" ADD CONSTRAINT "_ArticleToPracticeArea_B_fkey" FOREIGN KEY ("B") REFERENCES "PracticeArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
