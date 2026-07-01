-- SHEIN browser-assisted import workflow states.
-- Keeps older enum values for backwards compatibility while adding the V2/V1-business-flow states.
ALTER TYPE "SheinImportStatus" ADD VALUE IF NOT EXISTS 'EXTRACTING';
ALTER TYPE "SheinImportStatus" ADD VALUE IF NOT EXISTS 'MANUAL_REVIEW';
ALTER TYPE "SheinImportStatus" ADD VALUE IF NOT EXISTS 'REVIEWED';
ALTER TYPE "SheinImportStatus" ADD VALUE IF NOT EXISTS 'PUBLISHED';
