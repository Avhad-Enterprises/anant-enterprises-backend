-- =====================================================
-- MIGRATION: Restore Active Feature Tables (Hybrid Approach)
-- DATE: 31 January 2026
-- =====================================================
-- PURPOSE: Restore tables that are actively used in the codebase
--          (reviews, product_questions, wishlists, wishlist_items)
--          while keeping truly unused tables dropped.
--
-- CONTEXT: Previous migration dropped 19 tables, but some were
--          actively referenced in backend code causing 500 errors.
-- =====================================================

-- ===================
-- RESTORE ENUMS
-- ===================

-- Review status enum
CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected');

-- Question status enum  
CREATE TYPE question_status AS ENUM ('pending', 'answered', 'rejected');

-- ===================
-- RESTORE TABLES
-- ===================

-- Reviews Table
CREATE TABLE reviews (
    -- Identity
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    
    -- Links
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Content
    rating INTEGER NOT NULL,
    title VARCHAR(255),
    comment TEXT,
    media_urls JSONB DEFAULT '[]'::jsonb,
    
    -- Status & Metadata
    is_verified_purchase BOOLEAN NOT NULL DEFAULT false,
    status review_status NOT NULL DEFAULT 'pending',
    admin_reply TEXT,
    helpful_votes INTEGER NOT NULL DEFAULT 0,
    
    -- Audit Fields
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    
    -- Constraints
    CONSTRAINT reviews_rating_check CHECK (rating >= 1 AND rating <= 5)
);

-- Product Questions Table
CREATE TABLE product_questions (
    -- Identity
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    
    -- Links
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Content
    question TEXT NOT NULL,
    answer TEXT,
    
    -- Management
    answered_by UUID REFERENCES users(id) ON DELETE SET NULL,
    status question_status NOT NULL DEFAULT 'pending',
    is_public BOOLEAN NOT NULL DEFAULT false,
    
    -- Audit Fields
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT false
);

-- Wishlists Table
CREATE TABLE wishlists (
    -- Identity
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    
    -- Owner
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Metadata
    access_token VARCHAR(255),
    status BOOLEAN NOT NULL DEFAULT true,
    
    -- Audit Fields
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Wishlist Items Table
CREATE TABLE wishlist_items (
    wishlist_id UUID NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
    -- Metadata
    notes TEXT,
    
    -- Purchase tracking
    added_to_cart_at TIMESTAMP,
    purchased_at TIMESTAMP,
    order_id UUID,
    
    added_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Composite Primary Key
    PRIMARY KEY (wishlist_id, product_id)
);

-- ===================
-- CREATE INDEXES
-- ===================

-- Reviews indexes
CREATE INDEX reviews_product_id_idx ON reviews(product_id);
CREATE INDEX reviews_user_id_idx ON reviews(user_id);
CREATE INDEX reviews_status_idx ON reviews(status);
CREATE INDEX reviews_rating_idx ON reviews(rating);

-- Product Questions indexes
CREATE INDEX product_questions_product_id_idx ON product_questions(product_id);
CREATE INDEX product_questions_status_idx ON product_questions(status);

-- Wishlists indexes
CREATE INDEX wishlists_user_id_idx ON wishlists(user_id);
CREATE INDEX wishlists_access_token_idx ON wishlists(access_token);

-- Wishlist Items indexes
CREATE INDEX wishlist_items_product_id_idx ON wishlist_items(product_id);

-- ===================
-- ENABLE RLS
-- ===================

-- Enable Row Level Security
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;

-- ===================
-- RLS POLICIES
-- ===================

-- Reviews: Users can read approved reviews
CREATE POLICY "Users can view approved reviews"
ON reviews FOR SELECT
TO authenticated, anon
USING (status = 'approved' AND is_deleted = false);

-- Reviews: Users can create reviews
CREATE POLICY "Users can create reviews"
ON reviews FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Reviews: Users can update their own reviews
CREATE POLICY "Users can update own reviews"
ON reviews FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Product Questions: Public can read answered questions
CREATE POLICY "Public can view answered questions"
ON product_questions FOR SELECT
TO authenticated, anon
USING (status = 'answered' AND is_public = true AND is_deleted = false);

-- Product Questions: Users can create questions
CREATE POLICY "Users can create questions"
ON product_questions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Wishlists: Users can manage their own wishlists
CREATE POLICY "Users can view own wishlists"
ON wishlists FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create wishlists"
ON wishlists FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wishlists"
ON wishlists FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own wishlists"
ON wishlists FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Wishlist Items: Users can manage their own wishlist items
CREATE POLICY "Users can view own wishlist items"
ON wishlist_items FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM wishlists 
        WHERE wishlists.id = wishlist_items.wishlist_id 
        AND wishlists.user_id = auth.uid()
    )
);

CREATE POLICY "Users can add to own wishlist"
ON wishlist_items FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM wishlists 
        WHERE wishlists.id = wishlist_items.wishlist_id 
        AND wishlists.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update own wishlist items"
ON wishlist_items FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM wishlists 
        WHERE wishlists.id = wishlist_items.wishlist_id 
        AND wishlists.user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete own wishlist items"
ON wishlist_items FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM wishlists 
        WHERE wishlists.id = wishlist_items.wishlist_id 
        AND wishlists.user_id = auth.uid()
    )
);

-- ===================
-- GRANT PERMISSIONS
-- ===================

GRANT SELECT, INSERT, UPDATE ON reviews TO authenticated;
GRANT SELECT ON reviews TO anon;

GRANT SELECT, INSERT ON product_questions TO authenticated;
GRANT SELECT ON product_questions TO anon;

GRANT ALL ON wishlists TO authenticated;
GRANT ALL ON wishlist_items TO authenticated;

-- ===================
-- COMMENTS
-- ===================

COMMENT ON TABLE reviews IS 'Product reviews and ratings with moderation workflow';
COMMENT ON TABLE product_questions IS 'Product Q&A system for customer questions';
COMMENT ON TABLE wishlists IS 'User wishlist containers';
COMMENT ON TABLE wishlist_items IS 'Individual products saved to wishlists';
