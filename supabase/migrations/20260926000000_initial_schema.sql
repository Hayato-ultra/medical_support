-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Custom types
CREATE TYPE user_role AS ENUM ('CUSTOMER', 'PHARMACY_OWNER', 'PHARMACY_STAFF', 'RIDER', 'ADMIN');
CREATE TYPE staff_role AS ENUM ('OWNER', 'MANAGER', 'STAFF');
CREATE TYPE prescription_status AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE order_status AS ENUM ('PENDING', 'CONFIRMED', 'PACKING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED');
CREATE TYPE payment_status AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- Users table (synced from auth.users via trigger)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'CUSTOMER',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Customers table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Addresses table
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  address TEXT NOT NULL,
  pincode TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pharmacies table
CREATE TABLE pharmacies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  license_number TEXT UNIQUE NOT NULL,
  address TEXT NOT NULL,
  pincode TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  operating_hours JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pharmacy staff table
CREATE TABLE pharmacy_staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  role staff_role NOT NULL DEFAULT 'STAFF',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Medicines table
CREATE TABLE medicines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  manufacturer TEXT NOT NULL,
  dosage_form TEXT NOT NULL,
  strength TEXT NOT NULL,
  requires_prescription BOOLEAN NOT NULL DEFAULT FALSE,
  category TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inventory table
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  batch_number TEXT,
  expiry_date TIMESTAMPTZ,
  UNIQUE (pharmacy_id, medicine_id)
);

-- Prescriptions table
CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  status prescription_status NOT NULL DEFAULT 'PENDING',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Riders table (must be before orders for FK reference)
CREATE TABLE riders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  license_plate TEXT NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT FALSE,
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  prescription_id UUID REFERENCES prescriptions(id),
  status order_status NOT NULL DEFAULT 'PENDING',
  total_amount NUMERIC(10, 2) NOT NULL,
  delivery_fee NUMERIC(10, 2) NOT NULL,
  payment_intent_id TEXT,
  rider_id UUID REFERENCES riders(id),
  delivery_address JSONB NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Order items table
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status payment_status NOT NULL DEFAULT 'PENDING',
  payment_method TEXT,
  transaction_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tracking events table
CREATE TABLE tracking_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  location JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

-- OtpTokens table (for backward compatibility during migration)
CREATE TABLE otp_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_addresses_customer_id ON addresses(customer_id);
CREATE INDEX idx_pharmacies_license ON pharmacies(license_number);
CREATE INDEX idx_pharmacy_staff_user_id ON pharmacy_staff(user_id);
CREATE INDEX idx_pharmacy_staff_pharmacy_id ON pharmacy_staff(pharmacy_id);
CREATE INDEX idx_inventory_pharmacy_id ON inventory(pharmacy_id);
CREATE INDEX idx_inventory_medicine_id ON inventory(medicine_id);
CREATE INDEX idx_prescriptions_customer_id ON prescriptions(customer_id);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_pharmacy_id ON orders(pharmacy_id);
CREATE INDEX idx_orders_rider_id ON orders(rider_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_riders_user_id ON riders(user_id);
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_tracking_events_order_id ON tracking_events(order_id);
CREATE INDEX idx_otp_tokens_key ON otp_tokens(key);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pharmacies_updated_at BEFORE UPDATE ON pharmacies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pharmacy_staff_updated_at BEFORE UPDATE ON pharmacy_staff FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_medicines_updated_at BEFORE UPDATE ON medicines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_prescriptions_updated_at BEFORE UPDATE ON prescriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_riders_updated_at BEFORE UPDATE ON riders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users: Users can read their own record, admins can read all
CREATE POLICY "Users can read own record" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can read all users" ON users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Customers: Customer can read own, admins can read all
CREATE POLICY "Customers can read own" ON customers
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can read all customers" ON customers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Addresses: Customer can manage own addresses
CREATE POLICY "Customers can manage own addresses" ON addresses
  FOR ALL USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

-- Pharmacies: Public read for active pharmacies, admins full access
CREATE POLICY "Public can read active pharmacies" ON pharmacies
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins can manage pharmacies" ON pharmacies
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Pharmacy staff: Staff can read own pharmacy, admins can read all
CREATE POLICY "Staff can read own pharmacy" ON pharmacy_staff
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can read all staff" ON pharmacy_staff
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Medicines: Public read
CREATE POLICY "Public can read medicines" ON medicines
  FOR SELECT USING (TRUE);

-- Inventory: Pharmacy staff can manage own inventory, public read for active pharmacies
CREATE POLICY "Pharmacy staff can manage inventory" ON inventory
  FOR ALL USING (
    pharmacy_id IN (
      SELECT pharmacy_id FROM pharmacy_staff WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Public can read inventory for active pharmacies" ON inventory
  FOR SELECT USING (
    pharmacy_id IN (SELECT id FROM pharmacies WHERE is_active = TRUE)
  );

-- Prescriptions: Customer can read own, pharmacy staff can read for their pharmacy, admins all
CREATE POLICY "Customers can read own prescriptions" ON prescriptions
  FOR SELECT USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Pharmacy staff can read prescriptions for their pharmacy" ON prescriptions
  FOR SELECT USING (
    customer_id IN (
      SELECT c.id FROM customers c
      JOIN orders o ON o.customer_id = c.id
      WHERE o.pharmacy_id IN (
        SELECT pharmacy_id FROM pharmacy_staff WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can read all prescriptions" ON prescriptions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Customers can insert prescriptions" ON prescriptions
  FOR INSERT WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

-- Orders: Customer can read own, pharmacy staff can read for their pharmacy, rider can read assigned, admins all
CREATE POLICY "Customers can read own orders" ON orders
  FOR SELECT USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Pharmacy staff can read orders for their pharmacy" ON orders
  FOR SELECT USING (
    pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_staff WHERE user_id = auth.uid())
  );

CREATE POLICY "Riders can read assigned orders" ON orders
  FOR SELECT USING (rider_id IN (SELECT id FROM riders WHERE user_id = auth.uid()));

CREATE POLICY "Admins can read all orders" ON orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Customers can insert orders" ON orders
  FOR INSERT WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

-- Order items: Follow order permissions
CREATE POLICY "Order items follow order permissions" ON order_items
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM orders WHERE
        customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()) OR
        pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_staff WHERE user_id = auth.uid()) OR
        rider_id IN (SELECT id FROM riders WHERE user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
    )
  );

-- Riders: Rider can read own, admins all
CREATE POLICY "Riders can read own" ON riders
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can read all riders" ON riders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Payments: Follow order permissions
CREATE POLICY "Payments follow order permissions" ON payments
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM orders WHERE
        customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()) OR
        pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_staff WHERE user_id = auth.uid()) OR
        rider_id IN (SELECT id FROM riders WHERE user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
    )
  );

-- Tracking events: Follow order permissions
CREATE POLICY "Tracking follows order permissions" ON tracking_events
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM orders WHERE
        customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()) OR
        pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_staff WHERE user_id = auth.uid()) OR
        rider_id IN (SELECT id FROM riders WHERE user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
    )
  );

-- OtpTokens: User can read own (for OTP verification)
CREATE POLICY "Users can read own OTP tokens" ON otp_tokens
  FOR SELECT USING (key LIKE '%' || (SELECT phone FROM users WHERE id = auth.uid()) || '%');