-- Migration for Content Management Features
-- Add content version control, scheduling, tagging, and quality scoring

-- Content Version Control
CREATE TABLE content_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL, -- 'course', 'product', 'learning_material', etc.
    entity_id UUID NOT NULL,
    version_number INTEGER NOT NULL DEFAULT 1,
    content_data JSONB NOT NULL, -- Snapshot of the content at this version
    change_summary TEXT,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP,
    
    UNIQUE(entity_type, entity_id, version_number)
);

-- Content Scheduling
CREATE TABLE content_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action_type VARCHAR(50) NOT NULL, -- 'publish', 'unpublish', 'update'
    scheduled_at TIMESTAMP NOT NULL,
    content_data JSONB, -- Data to apply when scheduled action runs
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'executed', 'cancelled', 'failed'
    executed_at TIMESTAMP,
    error_message TEXT,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Content Tags
CREATE TABLE content_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7), -- Hex color code
    category VARCHAR(50), -- 'craft_type', 'difficulty', 'theme', etc.
    is_system_tag BOOLEAN DEFAULT FALSE, -- System-generated vs user-created
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(name, category)
);

-- Content Tag Associations
CREATE TABLE content_tag_associations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    tag_id UUID NOT NULL REFERENCES content_tags(id) ON DELETE CASCADE,
    confidence_score DECIMAL(3,2), -- For auto-generated tags (0.00-1.00)
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(entity_type, entity_id, tag_id)
);

-- Content Quality Scores
CREATE TABLE content_quality_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    overall_score DECIMAL(3,2) NOT NULL DEFAULT 0.00, -- 0.00-1.00
    completeness_score DECIMAL(3,2) DEFAULT 0.00,
    accuracy_score DECIMAL(3,2) DEFAULT 0.00,
    engagement_score DECIMAL(3,2) DEFAULT 0.00,
    multimedia_score DECIMAL(3,2) DEFAULT 0.00,
    language_quality_score DECIMAL(3,2) DEFAULT 0.00,
    
    -- Metrics used for scoring
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    completion_rate DECIMAL(3,2) DEFAULT 0.00,
    
    -- Quality flags
    has_description BOOLEAN DEFAULT FALSE,
    has_images BOOLEAN DEFAULT FALSE,
    has_videos BOOLEAN DEFAULT FALSE,
    has_multilingual_content BOOLEAN DEFAULT FALSE,
    
    last_calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(entity_type, entity_id)
);

-- Content Audit Log
CREATE TABLE content_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'publish', 'unpublish'
    old_data JSONB,
    new_data JSONB,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_content_versions_entity ON content_versions(entity_type, entity_id);
CREATE INDEX idx_content_versions_published ON content_versions(is_published, published_at);
CREATE INDEX idx_content_schedules_scheduled ON content_schedules(scheduled_at, status);
CREATE INDEX idx_content_schedules_entity ON content_schedules(entity_type, entity_id);
CREATE INDEX idx_content_tags_category ON content_tags(category);
CREATE INDEX idx_content_tag_associations_entity ON content_tag_associations(entity_type, entity_id);
CREATE INDEX idx_content_quality_scores_entity ON content_quality_scores(entity_type, entity_id);
CREATE INDEX idx_content_quality_scores_overall ON content_quality_scores(overall_score DESC);
CREATE INDEX idx_content_audit_log_entity ON content_audit_log(entity_type, entity_id);
CREATE INDEX idx_content_audit_log_created ON content_audit_log(created_at DESC);

-- Insert some default system tags
INSERT INTO content_tags (name, description, color, category, is_system_tag) VALUES
('初級', '適合初學者的內容', '#4CAF50', 'difficulty', TRUE),
('中級', '適合有基礎經驗者的內容', '#FF9800', 'difficulty', TRUE),
('高級', '適合進階學習者的內容', '#F44336', 'difficulty', TRUE),
('傳統工藝', '傳統手工藝相關內容', '#8BC34A', 'craft_type', TRUE),
('現代創新', '結合現代元素的創新內容', '#2196F3', 'craft_type', TRUE),
('文化歷史', '包含文化歷史背景的內容', '#9C27B0', 'theme', TRUE),
('實作教學', '以實際操作為主的教學內容', '#FF5722', 'theme', TRUE),
('理論知識', '以理論講解為主的內容', '#607D8B', 'theme', TRUE);