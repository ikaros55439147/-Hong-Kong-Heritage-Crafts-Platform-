-- Add new notification preference fields
ALTER TABLE notification_preferences 
ADD COLUMN craftsman_status_notify BOOLEAN DEFAULT true,
ADD COLUMN event_notify BOOLEAN DEFAULT true,
ADD COLUMN comment_notify BOOLEAN DEFAULT true,
ADD COLUMN like_notify BOOLEAN DEFAULT true,
ADD COLUMN reminder_notify BOOLEAN DEFAULT true,
ADD COLUMN marketing_notify BOOLEAN DEFAULT false;

-- Update existing records to have the new default values
UPDATE notification_preferences 
SET 
  craftsman_status_notify = true,
  event_notify = true,
  comment_notify = true,
  like_notify = true,
  reminder_notify = true,
  marketing_notify = false
WHERE 
  craftsman_status_notify IS NULL OR
  event_notify IS NULL OR
  comment_notify IS NULL OR
  like_notify IS NULL OR
  reminder_notify IS NULL OR
  marketing_notify IS NULL;