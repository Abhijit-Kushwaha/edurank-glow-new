-- Migration: Add Chat System for Friends
-- Date: 2026-01-27
-- Purpose: Implement real-time chat between friends

-- Chat rooms table (for friend-to-friend chats)
CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Chat participants table (links users to chat rooms)
CREATE TABLE IF NOT EXISTS public.chat_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'system')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Chat Rooms RLS Policies
-- Users can view chat rooms they participate in
CREATE POLICY "Users can view their chat rooms"
ON public.chat_rooms
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.chat_participants WHERE room_id = chat_rooms.id AND user_id = auth.uid())
);

-- Users can create chat rooms
CREATE POLICY "Users can create chat rooms"
ON public.chat_rooms
FOR INSERT
WITH CHECK (true);

-- Chat Participants RLS Policies
-- Users can view participants in rooms they participate in
CREATE POLICY "Users can view chat participants in their rooms"
ON public.chat_participants
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.chat_participants cp WHERE cp.room_id = chat_participants.room_id AND cp.user_id = auth.uid())
);

-- Users can join chat rooms (when invited or creating)
CREATE POLICY "Users can join chat rooms"
ON public.chat_participants
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Chat Messages RLS Policies
-- Users can view messages in rooms they participate in
CREATE POLICY "Users can view messages in their chat rooms"
ON public.chat_messages
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.chat_participants WHERE room_id = chat_messages.room_id AND user_id = auth.uid())
);

-- Users can send messages to rooms they participate in
CREATE POLICY "Users can send messages to their chat rooms"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (SELECT 1 FROM public.chat_participants WHERE room_id = chat_messages.room_id AND user_id = auth.uid())
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS chat_participants_room_user ON public.chat_participants(room_id, user_id);
CREATE INDEX IF NOT EXISTS chat_participants_user ON public.chat_participants(user_id);
CREATE INDEX IF NOT EXISTS chat_messages_room_created ON public.chat_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS chat_messages_sender ON public.chat_messages(sender_id);

-- Create triggers for updated_at
CREATE TRIGGER update_chat_rooms_updated_at
BEFORE UPDATE ON public.chat_rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chat_messages_updated_at
BEFORE UPDATE ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create or get chat room between two friends
CREATE OR REPLACE FUNCTION public.get_or_create_chat_room(friend_a UUID, friend_b UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  room_id UUID;
BEGIN
  -- Check if a chat room already exists between these two users
  SELECT cr.id INTO room_id
  FROM public.chat_rooms cr
  WHERE EXISTS (
    SELECT 1 FROM public.chat_participants cp1
    WHERE cp1.room_id = cr.id AND cp1.user_id = friend_a
  ) AND EXISTS (
    SELECT 1 FROM public.chat_participants cp2
    WHERE cp2.room_id = cr.id AND cp2.user_id = friend_b
  ) AND (
    SELECT COUNT(*) FROM public.chat_participants WHERE room_id = cr.id
  ) = 2;

  -- If no room exists, create one
  IF room_id IS NULL THEN
    INSERT INTO public.chat_rooms DEFAULT VALUES
    RETURNING id INTO room_id;

    INSERT INTO public.chat_participants (room_id, user_id) VALUES
    (room_id, friend_a),
    (room_id, friend_b);
  END IF;

  RETURN room_id;
END;
$$;