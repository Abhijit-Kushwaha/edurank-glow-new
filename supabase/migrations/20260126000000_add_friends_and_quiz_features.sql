-- Migration: Add Friend Request System and Quiz with Friends
-- Date: 2026-01-26
-- Purpose: Implement friend requests, friendships, and real-time quiz rooms

-- Friend Request System Tables

-- Friend requests table
CREATE TABLE IF NOT EXISTS public.friend_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(sender_id, receiver_id)
);

-- Friends table (accepted friendships)
CREATE TABLE IF NOT EXISTS public.friends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id < friend_id) -- Prevent duplicate friendships
);

-- Quiz with Friends Tables

-- Quiz rooms table
CREATE TABLE IF NOT EXISTS public.quiz_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished')),
  quiz_data JSONB, -- Store quiz questions, settings
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Quiz players table
CREATE TABLE IF NOT EXISTS public.quiz_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.quiz_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  finished_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(room_id, user_id)
);

-- Quiz answers table
CREATE TABLE IF NOT EXISTS public.quiz_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.quiz_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'friend_requests' AND n.nspname = 'public' AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'friends' AND n.nspname = 'public' AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'quiz_rooms' AND n.nspname = 'public' AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE public.quiz_rooms ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'quiz_players' AND n.nspname = 'public' AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE public.quiz_players ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'quiz_answers' AND n.nspname = 'public' AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Friend Requests RLS Policies

-- Users can view friend requests they sent or received
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'friend_requests' AND policyname = 'Users can view their friend requests'
  ) THEN
    CREATE POLICY "Users can view their friend requests"
    ON public.friend_requests
    FOR SELECT
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
  END IF;
END $$;

-- Users can create friend requests (as sender)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'friend_requests' AND policyname = 'Users can send friend requests'
  ) THEN
    CREATE POLICY "Users can send friend requests"
    ON public.friend_requests
    FOR INSERT
    WITH CHECK (auth.uid() = sender_id AND sender_id != receiver_id);
  END IF;
END $$;

-- Users can update friend requests they received (accept/reject)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'friend_requests' AND policyname = 'Users can update received friend requests'
  ) THEN
    CREATE POLICY "Users can update received friend requests"
    ON public.friend_requests
    FOR UPDATE
    USING (auth.uid() = receiver_id);
  END IF;
END $$;

-- Friends RLS Policies

-- Users can view their friendships
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'friends' AND policyname = 'Users can view their friendships'
  ) THEN
    CREATE POLICY "Users can view their friendships"
    ON public.friends
    FOR SELECT
    USING (auth.uid() = user_id OR auth.uid() = friend_id);
  END IF;
END $$;

-- Users can create friendships (when accepting requests)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'friends' AND policyname = 'Users can create friendships'
  ) THEN
    CREATE POLICY "Users can create friendships"
    ON public.friends
    FOR INSERT
    WITH CHECK (auth.uid() = user_id OR auth.uid() = friend_id);
  END IF;
END $$;

-- Quiz Rooms RLS Policies

-- Users can view quiz rooms they created or joined
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'quiz_rooms' AND policyname = 'Users can view their quiz rooms'
  ) THEN
    CREATE POLICY "Users can view their quiz rooms"
    ON public.quiz_rooms
    FOR SELECT
    USING (
      auth.uid() = host_id OR
      EXISTS (SELECT 1 FROM public.quiz_players WHERE room_id = quiz_rooms.id AND user_id = auth.uid())
    );
  END IF;
END $$;

-- Users can create quiz rooms
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'quiz_rooms' AND policyname = 'Users can create quiz rooms'
  ) THEN
    CREATE POLICY "Users can create quiz rooms"
    ON public.quiz_rooms
    FOR INSERT
    WITH CHECK (auth.uid() = host_id);
  END IF;
END $$;

-- Users can update quiz rooms they host
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'quiz_rooms' AND policyname = 'Users can update their quiz rooms'
  ) THEN
    CREATE POLICY "Users can update their quiz rooms"
    ON public.quiz_rooms
    FOR UPDATE
    USING (auth.uid() = host_id);
  END IF;
END $$;

-- Quiz Players RLS Policies

-- Users can view players in rooms they participate in
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'quiz_players' AND policyname = 'Users can view quiz players in their rooms'
  ) THEN
    CREATE POLICY "Users can view quiz players in their rooms"
    ON public.quiz_players
    FOR SELECT
    USING (
      auth.uid() = user_id OR
      EXISTS (SELECT 1 FROM public.quiz_rooms WHERE id = room_id AND host_id = auth.uid()) OR
      EXISTS (SELECT 1 FROM public.quiz_players qp WHERE qp.room_id = room_id AND qp.user_id = auth.uid())
    );
  END IF;
END $$;

-- Users can join quiz rooms
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'quiz_players' AND policyname = 'Users can join quiz rooms'
  ) THEN
    CREATE POLICY "Users can join quiz rooms"
    ON public.quiz_players
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Users can update their own player records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'quiz_players' AND policyname = 'Users can update their quiz player records'
  ) THEN
    CREATE POLICY "Users can update their quiz player records"
    ON public.quiz_players
    FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Quiz Answers RLS Policies

-- Users can view answers in rooms they participate in
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'quiz_answers' AND policyname = 'Users can view quiz answers in their rooms'
  ) THEN
    CREATE POLICY "Users can view quiz answers in their rooms"
    ON public.quiz_answers
    FOR SELECT
    USING (
      auth.uid() = user_id OR
      EXISTS (SELECT 1 FROM public.quiz_rooms WHERE id = room_id AND host_id = auth.uid()) OR
      EXISTS (SELECT 1 FROM public.quiz_players qp WHERE qp.room_id = room_id AND qp.user_id = auth.uid())
    );
  END IF;
END $$;

-- Users can submit their answers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'quiz_answers' AND policyname = 'Users can submit quiz answers'
  ) THEN
    CREATE POLICY "Users can submit quiz answers"
    ON public.quiz_answers
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Create indexes for performance

-- Friend requests indexes
CREATE INDEX IF NOT EXISTS friend_requests_sender_status ON public.friend_requests(sender_id, status);
CREATE INDEX IF NOT EXISTS friend_requests_receiver_status ON public.friend_requests(receiver_id, status);
CREATE INDEX IF NOT EXISTS friend_requests_status_created ON public.friend_requests(status, created_at DESC);

-- Friends indexes
CREATE INDEX IF NOT EXISTS friends_user_id ON public.friends(user_id);
CREATE INDEX IF NOT EXISTS friends_friend_id ON public.friends(friend_id);

-- Quiz rooms indexes
CREATE INDEX IF NOT EXISTS quiz_rooms_host_status ON public.quiz_rooms(host_id, status);
CREATE INDEX IF NOT EXISTS quiz_rooms_status_created ON public.quiz_rooms(status, created_at DESC);

-- Quiz players indexes
CREATE INDEX IF NOT EXISTS quiz_players_room_user ON public.quiz_players(room_id, user_id);
CREATE INDEX IF NOT EXISTS quiz_players_user_score ON public.quiz_players(user_id, score DESC);

-- Quiz answers indexes
CREATE INDEX IF NOT EXISTS quiz_answers_room_question ON public.quiz_answers(room_id, question_id);
CREATE INDEX IF NOT EXISTS quiz_answers_user_room ON public.quiz_answers(user_id, room_id);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_friend_requests_updated_at
BEFORE UPDATE ON public.friend_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quiz_rooms_updated_at
BEFORE UPDATE ON public.quiz_rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Helper functions

-- Function to check if users are already friends
CREATE OR REPLACE FUNCTION public.are_friends(user_a UUID, user_b UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.friends
    WHERE (user_id = user_a AND friend_id = user_b) OR (user_id = user_b AND friend_id = user_a)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get friend request status between two users
CREATE OR REPLACE FUNCTION public.get_friend_request_status(user_a UUID, user_b UUID)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  SELECT status INTO result
  FROM public.friend_requests
  WHERE (sender_id = user_a AND receiver_id = user_b) OR (sender_id = user_b AND receiver_id = user_a)
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN COALESCE(result, 'none');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send friend request (prevents duplicates and self-requests)
CREATE OR REPLACE FUNCTION public.send_friend_request(p_receiver_id UUID)
RETURNS JSON AS $$
DECLARE
  v_sender_id UUID := auth.uid();
  v_existing_status TEXT;
  result JSON;
BEGIN
  -- Validate input
  IF v_sender_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF v_sender_id = p_receiver_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot send friend request to yourself');
  END IF;

  -- Check if already friends
  IF public.are_friends(v_sender_id, p_receiver_id) THEN
    RETURN json_build_object('success', false, 'error', 'Already friends');
  END IF;

  -- Check existing request status
  v_existing_status := public.get_friend_request_status(v_sender_id, p_receiver_id);

  IF v_existing_status = 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Friend request already pending');
  ELSIF v_existing_status = 'accepted' THEN
    RETURN json_build_object('success', false, 'error', 'Already friends');
  END IF;

  -- Insert or update friend request
  INSERT INTO public.friend_requests (sender_id, receiver_id, status)
  VALUES (v_sender_id, p_receiver_id, 'pending')
  ON CONFLICT (sender_id, receiver_id)
  DO UPDATE SET
    status = 'pending',
    updated_at = now()
  WHERE friend_requests.status != 'accepted';

  RETURN json_build_object('success', true, 'message', 'Friend request sent');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept friend request
CREATE OR REPLACE FUNCTION public.accept_friend_request(p_sender_id UUID)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_smaller_id UUID;
  v_larger_id UUID;
BEGIN
  -- Update friend request status
  UPDATE public.friend_requests
  SET status = 'accepted', updated_at = now()
  WHERE sender_id = p_sender_id AND receiver_id = v_user_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Friend request not found or already processed');
  END IF;

  -- Create friendship record (ensure consistent ordering)
  v_smaller_id := LEAST(p_sender_id, v_user_id);
  v_larger_id := GREATEST(p_sender_id, v_user_id);

  INSERT INTO public.friends (user_id, friend_id)
  VALUES (v_smaller_id, v_larger_id)
  ON CONFLICT (user_id, friend_id) DO NOTHING;

  RETURN json_build_object('success', true, 'message', 'Friend request accepted');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject friend request
CREATE OR REPLACE FUNCTION public.reject_friend_request(p_sender_id UUID)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  UPDATE public.friend_requests
  SET status = 'rejected', updated_at = now()
  WHERE sender_id = p_sender_id AND receiver_id = v_user_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Friend request not found');
  END IF;

  RETURN json_build_object('success', true, 'message', 'Friend request rejected');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.friend_requests TO authenticated;
GRANT ALL ON public.friends TO authenticated;
GRANT ALL ON public.quiz_rooms TO authenticated;
GRANT ALL ON public.quiz_players TO authenticated;
GRANT ALL ON public.quiz_answers TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.send_friend_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_friend_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_friend_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.are_friends(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_friend_request_status(UUID, UUID) TO authenticated;