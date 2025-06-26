-- AlterTable: Add new columns with temporary defaults
ALTER TABLE "Technician" 
ADD COLUMN "firstName" TEXT,
ADD COLUMN "lastName" TEXT;

-- Update existing records: split name into firstName and lastName
UPDATE "Technician"
SET 
  "firstName" = COALESCE(SPLIT_PART("name", ' ', 1), 'Unknown'),
  "lastName" = COALESCE(
    CASE 
      WHEN POSITION(' ' IN "name") > 0 
      THEN SUBSTRING("name" FROM POSITION(' ' IN "name") + 1)
      ELSE ''
    END,
    ''
  );

-- Make columns required after data migration
ALTER TABLE "Technician"
ALTER COLUMN "firstName" SET NOT NULL,
ALTER COLUMN "lastName" SET NOT NULL,
ALTER COLUMN "name" DROP NOT NULL;
