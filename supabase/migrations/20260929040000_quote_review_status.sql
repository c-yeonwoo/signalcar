-- Keep this enum change in its own migration transaction.
ALTER TYPE public.brief_status ADD VALUE IF NOT EXISTS 'reviewing';
