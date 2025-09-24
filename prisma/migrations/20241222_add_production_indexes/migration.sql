-- Production Performance Indexes Migration
-- This migration adds indexes to optimize query performance in production

-- User table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Craftsman profiles indexes
CREATE INDEX IF NOT EXISTS idx_craftsman_profiles_user_id ON craftsman_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_craftsman_profiles_verification_status ON craftsman_profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_craftsman_profiles_craft_specialties ON craftsman_profiles USING GIN(craft_specialties);

-- Courses indexes
CREATE INDEX IF NOT EXISTS idx_courses_craftsman_id ON courses(craftsman_id);
CREATE INDEX IF NOT EXISTS idx_courses_craft_category ON courses(craft_category);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_created_at ON courses(created_at);
CREATE INDEX IF NOT EXISTS idx_courses_price ON courses(price);

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_craftsman_id ON products(craftsman_id);
CREATE INDEX IF NOT EXISTS idx_products_craft_category ON products(craft_category);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_inventory_quantity ON products(inventory_quantity);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_total_amount ON orders(total_amount);

-- Order items indexes (if exists)
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id) WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items');
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id) WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items');

-- Bookings indexes
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id) WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings');
CREATE INDEX IF NOT EXISTS idx_bookings_course_id ON bookings(course_id) WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings');
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status) WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings');
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at) WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings');

-- Media files indexes
CREATE INDEX IF NOT EXISTS idx_media_files_uploader_id ON media_files(uploader_id);
CREATE INDEX IF NOT EXISTS idx_media_files_file_type ON media_files(file_type);
CREATE INDEX IF NOT EXISTS idx_media_files_created_at ON media_files(created_at);

-- Comments indexes (if exists)
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id) WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'comments');
CREATE INDEX IF NOT EXISTS idx_comments_content_id ON comments(content_id) WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'comments');
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at) WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'comments');

-- Notifications indexes (if exists)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id) WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications');
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read) WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications');
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at) WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications');

-- User behavior tracking indexes (if exists)
CREATE INDEX IF NOT EXISTS idx_user_behaviors_user_id ON user_behaviors(user_id) WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_behaviors');
CREATE INDEX IF NOT EXISTS idx_user_behaviors_action_type ON user_behaviors(action_type) WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_behaviors');
CREATE INDEX IF NOT EXISTS idx_user_behaviors_created_at ON user_behaviors(created_at) WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_behaviors');

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_courses_category_status ON courses(craft_category, status);
CREATE INDEX IF NOT EXISTS idx_products_category_status ON products(craft_category, status);
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_craftsman_verification_created ON craftsman_profiles(verification_status, created_at);

-- Full-text search indexes for JSONB content
CREATE INDEX IF NOT EXISTS idx_courses_title_gin ON courses USING GIN(title);
CREATE INDEX IF NOT EXISTS idx_courses_description_gin ON courses USING GIN(description);
CREATE INDEX IF NOT EXISTS idx_products_name_gin ON products USING GIN(name);
CREATE INDEX IF NOT EXISTS idx_products_description_gin ON products USING GIN(description);
CREATE INDEX IF NOT EXISTS idx_craftsman_bio_gin ON craftsman_profiles USING GIN(bio);