-- Fix password_hash constraint and other issues
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Also ensure phone is not required in users table since we moved it to customers/riders
ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;

-- Remove unique constraint on phone since it's in customers/riders
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_phone_key;