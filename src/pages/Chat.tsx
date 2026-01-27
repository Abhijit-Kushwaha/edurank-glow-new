import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Send, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Logo from '@/components/Logo';

interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  created_at: string;
  sender_profile?: any;
}

interface ChatParticipant {
  user_id: string;
  profile: any;
}

const Chat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [participants, setParticipants] = useState<ChatParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [roomId, setRoomId] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const friendId = searchParams.get('friend');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (friendId && user) {
      initializeChat();
    }
  }, [friendId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (roomId) {
      // Subscribe to real-time messages
      const channel = supabase
        .channel(`chat_room_${roomId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `room_id=eq.${roomId}`,
          },
          (payload) => {
            const newMsg = payload.new as ChatMessage;
            setMessages(prev => [...prev, newMsg]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [roomId]);

  const initializeChat = async () => {
    try {
      // Get or create chat room
      const { data: roomData, error: roomError } = await (supabase as any)
        .rpc('get_or_create_chat_room', {
          friend_a: user!.id,
          friend_b: friendId
        });

      if (roomError) throw roomError;

      setRoomId(roomData);

      // Load participants
      const { data: participantsData, error: participantsError } = await (supabase as any)
        .from('chat_participants')
        .select(`
          user_id,
          profile:profiles (
            name,
            avatar_url
          )
        `)
        .eq('room_id', roomData);

      if (participantsError) throw participantsError;
      setParticipants(participantsData || []);

      // Load messages
      await loadMessages(roomData);
    } catch (error) {
      console.error('Error initializing chat:', error);
      toast.error('Failed to load chat');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (roomId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('chat_messages')
        .select(`
          id,
          room_id,
          sender_id,
          content,
          message_type,
          created_at,
          sender_profile:profiles (
            name,
            avatar_url
          )
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !roomId) return;

    try {
      const { error } = await (supabase as any)
        .from('chat_messages')
        .insert({
          room_id: roomId,
          sender_id: user!.id,
          content: newMessage.trim(),
          message_type: 'text'
        });

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const getOtherParticipant = () => {
    return participants.find(p => p.user_id !== user?.id);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const otherParticipant = getOtherParticipant();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/friends')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Logo size="sm" />
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={otherParticipant?.profile.avatar_url} />
                <AvatarFallback>
                  {otherParticipant?.profile.name?.charAt(0)?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-lg font-semibold">
                  {otherParticipant?.profile.name || 'Chat'}
                </h1>
                <p className="text-xs text-muted-foreground">Online</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Card className="h-[600px] flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Chat
            </CardTitle>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0">
            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Start a conversation!</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isOwnMessage = message.sender_id === user?.id;
                    return (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isOwnMessage && (
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={message.sender_profile?.avatar_url} />
                            <AvatarFallback>
                              {message.sender_profile?.name?.charAt(0)?.toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={`max-w-[70%] rounded-lg px-3 py-2 ${
                            isOwnMessage
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {formatTime(message.created_at)}
                          </p>
                        </div>
                        {isOwnMessage && (
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user?.user_metadata?.avatar_url} />
                            <AvatarFallback>
                              {user?.user_metadata?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="border-t p-4">
              <form onSubmit={sendMessage} className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button type="submit" disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Chat;