-- First check if the admin user exists
SELECT * FROM "Technician" WHERE email = 'petecabrera@getclarity.services';

-- If not, create the admin user
-- Note: You'll need to generate the password hash separately
-- This example uses a bcrypt hash for 'ChangeThisPassword123!'
INSERT INTO "Technician" (
  id,
  email,
  name,
  "firstName",
  "lastName",
  "passwordHash",
  phone,
  active,
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  'petecabrera@getclarity.services',
  'Pete Cabrera',
  'Pete',
  'Cabrera',
  -- This is a bcrypt hash for 'ChangeThisPassword123!' - CHANGE THIS!
  '$2b$10$YourActualHashHere',
  '555-0000',
  true,
  NOW(),
  NOW()
);

-- Or if the user exists but needs a password, update it:
UPDATE "Technician"
SET "passwordHash" = '$2b$10$YourActualHashHere'
WHERE email = 'petecabrera@getclarity.services';