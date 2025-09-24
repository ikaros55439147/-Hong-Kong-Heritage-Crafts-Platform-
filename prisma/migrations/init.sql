-- Initial migration for Hong Kong Heritage Crafts Platform
-- This file contains the complete database schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE "UserRole" AS ENUM ('LEARNER', 'CRAFTSMAN', 'ADMIN');
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE "CourseStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DRAFT');
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'OUT_OF_STOCK');
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- Users table
CREATE TABLE "users" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'LEARNER',
    "preferred_language" VARCHAR(10) NOT NULL DEFAULT 'zh-HK',
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Craftsman profiles table
CREATE TABLE "craftsman_profiles" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID UNIQUE NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "craft_specialties" TEXT[] NOT NULL,
    "bio" JSONB,
    "experience_years" INTEGER,
    "workshop_location" VARCHAR(255),
    "contact_info" JSONB,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Courses table
CREATE TABLE "courses" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "craftsman_id" UUID NOT NULL REFERENCES "craftsman_profiles"("id"),
    "title" JSONB NOT NULL,
    "description" JSONB,
    "craft_category" VARCHAR(100) NOT NULL,
    "max_participants" INTEGER,
    "duration_hours" DECIMAL(4,2),
    "price" DECIMAL(10,2),
    "status" "CourseStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bookings table
CREATE TABLE "bookings" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL REFERENCES "users"("id"),
    "course_id" UUID NOT NULL REFERENCES "courses"("id"),
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE "products" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "craftsman_id" UUID NOT NULL REFERENCES "craftsman_profiles"("id"),
    "name" JSONB NOT NULL,
    "description" JSONB,
    "price" DECIMAL(10,2) NOT NULL,
    "inventory_quantity" INTEGER NOT NULL DEFAULT 0,
    "is_customizable" BOOLEAN NOT NULL DEFAULT FALSE,
    "craft_category" VARCHAR(100) NOT NULL,
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE "orders" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL REFERENCES "users"("id"),
    "total_amount" DECIMAL(10,2) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "shipping_address" JSONB,
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Order items table
CREATE TABLE "order_items" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "order_id" UUID NOT NULL REFERENCES "orders"("id"),
    "product_id" UUID NOT NULL REFERENCES "products"("id"),
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL
);

-- Media files table
CREATE TABLE "media_files" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "uploader_id" UUID NOT NULL REFERENCES "users"("id"),
    "file_type" VARCHAR(50) NOT NULL,
    "file_url" VARCHAR(500) NOT NULL,
    "file_size" BIGINT,
    "metadata" JSONB,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Follows table (for user following system)
CREATE TABLE "follows" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "follower_id" UUID NOT NULL REFERENCES "users"("id"),
    "following_id" UUID NOT NULL REFERENCES "users"("id"),
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("follower_id", "following_id")
);

-- Create indexes for better performance
CREATE INDEX "idx_users_email" ON "users"("email");
CREATE INDEX "idx_users_role" ON "users"("role");
CREATE INDEX "idx_craftsman_profiles_user_id" ON "craftsman_profiles"("user_id");
CREATE INDEX "idx_craftsman_profiles_verification_status" ON "craftsman_profiles"("verification_status");
CREATE INDEX "idx_courses_craftsman_id" ON "courses"("craftsman_id");
CREATE INDEX "idx_courses_craft_category" ON "courses"("craft_category");
CREATE INDEX "idx_courses_status" ON "courses"("status");
CREATE INDEX "idx_bookings_user_id" ON "bookings"("user_id");
CREATE INDEX "idx_bookings_course_id" ON "bookings"("course_id");
CREATE INDEX "idx_bookings_status" ON "bookings"("status");
CREATE INDEX "idx_products_craftsman_id" ON "products"("craftsman_id");
CREATE INDEX "idx_products_craft_category" ON "products"("craft_category");
CREATE INDEX "idx_products_status" ON "products"("status");
CREATE INDEX "idx_orders_user_id" ON "orders"("user_id");
CREATE INDEX "idx_orders_status" ON "orders"("status");
CREATE INDEX "idx_order_items_order_id" ON "order_items"("order_id");
CREATE INDEX "idx_order_items_product_id" ON "order_items"("product_id");
CREATE INDEX "idx_media_files_uploader_id" ON "media_files"("uploader_id");
CREATE INDEX "idx_follows_follower_id" ON "follows"("follower_id");
CREATE INDEX "idx_follows_following_id" ON "follows"("following_id");

-- Create GIN indexes for JSONB columns (for better search performance)
CREATE INDEX "idx_craftsman_profiles_bio_gin" ON "craftsman_profiles" USING GIN ("bio");
CREATE INDEX "idx_courses_title_gin" ON "courses" USING GIN ("title");
CREATE INDEX "idx_courses_description_gin" ON "courses" USING GIN ("description");
CREATE INDEX "idx_products_name_gin" ON "products" USING GIN ("name");
CREATE INDEX "idx_products_description_gin" ON "products" USING GIN ("description");

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for users table
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON "users" 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (password: admin123)
-- Note: In production, this should be changed immediately
INSERT INTO "users" ("email", "password_hash", "role") 
VALUES ('admin@hk-heritage-crafts.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ADMIN');

-- Insert sample craft categories data
-- This could be moved to a separate seed script
INSERT INTO "users" ("email", "password_hash", "role") 
VALUES 
    ('master.mahjong@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'CRAFTSMAN'),
    ('learner@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'LEARNER');

-- Insert sample craftsman profile
INSERT INTO "craftsman_profiles" ("user_id", "craft_specialties", "bio", "experience_years", "workshop_location", "verification_status")
SELECT 
    u.id,
    ARRAY['手雕麻將', '傳統雕刻'],
    '{"zh-HK": "資深手雕麻將師傅，擁有30年經驗", "en": "Senior hand-carved mahjong craftsman with 30 years of experience"}',
    30,
    '香港九龍深水埗',
    'VERIFIED'
FROM "users" u 
WHERE u.email = 'master.mahjong@example.com';