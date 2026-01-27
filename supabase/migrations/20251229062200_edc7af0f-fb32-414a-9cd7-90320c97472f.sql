-- Add unique constraint for upsert operations on video_progress
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'video_progress_todo_user_unique' 
    AND conrelid = 'public.video_progress'::regclass
  ) THEN
    ALTER TABLE public.video_progress 
    ADD CONSTRAINT video_progress_todo_user_unique UNIQUE (todo_id, user_id);
  END IF;
END $$;

-- Add unique constraint for upsert operations on notes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'notes_todo_user_unique' 
    AND conrelid = 'public.notes'::regclass
  ) THEN
    ALTER TABLE public.notes 
    ADD CONSTRAINT notes_todo_user_unique UNIQUE (todo_id, user_id);
  END IF;
END $$;