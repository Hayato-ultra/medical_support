-- Add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS customer_id UUID;

-- Add missing columns to customers table (phone should be optional)
ALTER TABLE customers ALTER COLUMN phone DROP NOT NULL;

-- Add missing columns to riders table (phone should be optional)
ALTER TABLE riders ALTER COLUMN phone DROP NOT NULL;

-- Add missing columns to pharmacies table
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION DEFAULT 0;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION DEFAULT 0;

-- Create index for name searches
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);