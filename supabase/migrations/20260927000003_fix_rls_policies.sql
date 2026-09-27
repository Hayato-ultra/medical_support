-- Fix infinite recursion in users table RLS policy
-- Drop existing policies and recreate them properly

-- Drop all existing policies on users
DROP POLICY IF EXISTS "Users can read own record" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Users can update own record" ON users;

-- Create simple, non-recursive policies
-- Users can read their own record
CREATE POLICY "Users can read own record" ON users
  FOR SELECT USING (auth.uid() = id);

-- Admins can read all users (using auth.jwt() to avoid recursion)
CREATE POLICY "Admins can read all users" ON users
  FOR SELECT USING (
    (auth.jwt() ->> 'role') = 'ADMIN'
  );

-- Users can update their own record
CREATE POLICY "Users can update own record" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Also fix other tables with similar issues
-- Drop and recreate policies for customers
DROP POLICY IF EXISTS "Customers can read own" ON customers;
DROP POLICY IF EXISTS "Admins can read all customers" ON customers;
DROP POLICY IF EXISTS "Customers can update own" ON customers;

CREATE POLICY "Customers can read own" ON customers
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can read all customers" ON customers
  FOR SELECT USING (
    (auth.jwt() ->> 'role') = 'ADMIN'
  );

CREATE POLICY "Customers can update own" ON customers
  FOR UPDATE USING (user_id = auth.uid());

-- Fix addresses policies
DROP POLICY IF EXISTS "Customers can manage own addresses" ON addresses;
CREATE POLICY "Customers can manage own addresses" ON addresses
  FOR ALL USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

-- Fix pharmacy_staff policies
DROP POLICY IF EXISTS "Staff can read own pharmacy" ON pharmacy_staff;
DROP POLICY IF EXISTS "Admins can read all staff" ON pharmacy_staff;

CREATE POLICY "Staff can read own pharmacy" ON pharmacy_staff
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can read all staff" ON pharmacy_staff
  FOR SELECT USING (
    (auth.jwt() ->> 'role') = 'ADMIN'
  );

-- Fix prescriptions policies
DROP POLICY IF EXISTS "Customers can read own prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "Pharmacy staff can read prescriptions for their pharmacy" ON prescriptions;
DROP POLICY IF EXISTS "Admins can read all prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "Customers can insert prescriptions" ON prescriptions;

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
    (auth.jwt() ->> 'role') = 'ADMIN'
  );

CREATE POLICY "Customers can insert prescriptions" ON prescriptions
  FOR INSERT WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

-- Fix orders policies
DROP POLICY IF EXISTS "Customers can read own orders" ON orders;
DROP POLICY IF EXISTS "Pharmacy staff can read orders for their pharmacy" ON orders;
DROP POLICY IF EXISTS "Riders can read assigned orders" ON orders;
DROP POLICY IF EXISTS "Admins can read all orders" ON orders;
DROP POLICY IF EXISTS "Customers can insert orders" ON orders;

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
    (auth.jwt() ->> 'role') = 'ADMIN'
  );

CREATE POLICY "Customers can insert orders" ON orders
  FOR INSERT WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

-- Fix order_items policies
DROP POLICY IF EXISTS "Order items follow order permissions" ON order_items;
CREATE POLICY "Order items follow order permissions" ON order_items
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM orders WHERE
        customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()) OR
        pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_staff WHERE user_id = auth.uid()) OR
        rider_id IN (SELECT id FROM riders WHERE user_id = auth.uid()) OR
        (auth.jwt() ->> 'role') = 'ADMIN'
    )
  );

-- Fix riders policies
DROP POLICY IF EXISTS "Riders can read own" ON riders;
DROP POLICY IF EXISTS "Admins can read all riders" ON riders;

CREATE POLICY "Riders can read own" ON riders
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can read all riders" ON riders
  FOR SELECT USING (
    (auth.jwt() ->> 'role') = 'ADMIN'
  );

-- Fix payments policies
DROP POLICY IF EXISTS "Payments follow order permissions" ON payments;
CREATE POLICY "Payments follow order permissions" ON payments
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM orders WHERE
        customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()) OR
        pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_staff WHERE user_id = auth.uid()) OR
        rider_id IN (SELECT id FROM riders WHERE user_id = auth.uid()) OR
        (auth.jwt() ->> 'role') = 'ADMIN'
    )
  );

-- Fix tracking_events policies
DROP POLICY IF EXISTS "Tracking follows order permissions" ON tracking_events;
CREATE POLICY "Tracking follows order permissions" ON tracking_events
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM orders WHERE
        customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()) OR
        pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_staff WHERE user_id = auth.uid()) OR
        rider_id IN (SELECT id FROM riders WHERE user_id = auth.uid()) OR
        (auth.jwt() ->> 'role') = 'ADMIN'
    )
  );