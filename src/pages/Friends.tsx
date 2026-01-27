import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, Users, MessageCircle, Trophy, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAchievements } from '@/hooks/useAchievements';
import Logo from '@/components/Logo';

interface Friend {
  id: string;
  user_id: string;
  name: string;
  avatar_url?: string;
}

interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  sender?: Friend;
  receiver?: Friend;
}

const Friends = () => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { trackFriendRequest } = useAchievements();

  // Load friends and friend requests
  useEffect(() => {
    if (user) {
      loadFriends();
      loadFriendRequests();
    }
  }, [user]);

  const loadFriends = async () => {
    try {
      const { data, error } = await supabase
        .from('friends')
        .select(`
          id,
          user_id,
          friend_id,
          created_at,
          friend_profile:profiles!friends_friend_id_fkey (
            id,
            user_id,
            name,
            avatar_url
          )
        `)
        .or(`user_id.eq.${user!.id},friend_id.eq.${user!.id}`);

      if (error) throw error;

      const friendList = data?.map(friend => ({
        id: friend.friend_profile.id,
        user_id: friend.user_id === user!.id ? friend.friend_id : friend.user_id,
        name: friend.friend_profile.name || 'Unknown',
        avatar_url: friend.friend_profile.avatar_url
      })) || [];

      setFriends(friendList);
    } catch (error) {
      console.error('Error loading friends:', error);
      toast.error('Failed to load friends');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFriendRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('friend_requests')
        .select(`
          id,
          sender_id,
          receiver_id,
          status,
          created_at,
          sender_profile:profiles!friend_requests_sender_id_fkey (
            id,
            user_id,
            name,
            avatar_url
          ),
          receiver_profile:profiles!friend_requests_receiver_id_fkey (
            id,
            user_id,
            name,
            avatar_url
          )
        `)
        .or(`sender_id.eq.${user!.id},receiver_id.eq.${user!.id}`)
        .eq('status', 'pending');

      if (error) throw error;
      setFriendRequests(data || []);
    } catch (error) {
      console.error('Error loading friend requests:', error);
      toast.error('Failed to load friend requests');
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    if (!user?.id) {
      console.error('User not authenticated');
      toast.error('You must be logged in to search users');
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .rpc('search_users', {
          search_query: query,
          current_user_id: user.id
        });

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Failed to search users');
    } finally {
      setIsSearching(false);
    }
  };

  const sendFriendRequest = async (receiverId: string) => {
    if (!user?.id) {
      toast.error('You must be logged in to send friend requests');
      return;
    }

    try {
      const { error } = await supabase
        .from('friend_requests')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          status: 'pending'
        });

      if (error) throw error;

      toast.success('Friend request sent!');
      trackFriendRequest();
      loadFriendRequests(); // Refresh requests
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      if (error.code === '23505') { // Unique constraint violation
        toast.error('Friend request already sent');
      } else {
        toast.error('Failed to send friend request');
      }
    }
  };

  const acceptFriendRequest = async (requestId: string, senderId: string) => {
    try {
      // Update request status
      const { error: updateError } = await supabase
        .from('friend_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Create friendship
      const { error: friendError } = await supabase
        .from('friends')
        .insert({
          user_id: user!.id,
          friend_id: senderId
        });

      if (friendError) throw friendError;

      toast.success('Friend request accepted!');
      loadFriends();
      loadFriendRequests();
    } catch (error) {
      console.error('Error accepting friend request:', error);
      toast.error('Failed to accept friend request');
    }
  };

  const rejectFriendRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Friend request rejected');
      loadFriendRequests();
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      toast.error('Failed to reject friend request');
    }
  };

  const startQuizWithFriend = (friendId: string) => {
    // Navigate to quiz room creation with friend
    navigate(`/quiz-room?friend=${friendId}`);
  };

  const startChatWithFriend = (friendId: string) => {
    // Navigate to chat with friend
    navigate(`/chat?friend=${friendId}`);
  };

  const receivedRequests = friendRequests.filter(req => req.receiver_id === user?.id);
  const sentRequests = friendRequests.filter(req => req.sender_id === user?.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Logo size="sm" />
              <h1 className="text-2xl font-bold">Friends</h1>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard')}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="friends" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="friends">My Friends ({friends.length})</TabsTrigger>
            <TabsTrigger value="requests">Requests ({receivedRequests.length})</TabsTrigger>
            <TabsTrigger value="find">Find Friends</TabsTrigger>
          </TabsList>

          {/* Friends Tab */}
          <TabsContent value="friends" className="space-y-4">
            {friends.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No friends yet</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Start by finding friends to study with!
                  </p>
                  <Button onClick={() => document.querySelector('[value="find"]')?.click()}>
                    Find Friends
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {friends.map((friend) => (
                  <Card key={friend.user_id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={friend.avatar_url} />
                          <AvatarFallback>
                            {friend.name?.charAt(0)?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="font-semibold">{friend.name}</h3>
                          <p className="text-sm text-muted-foreground">Friend</p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startQuizWithFriend(friend.user_id)}
                          className="flex-1"
                        >
                          <Trophy className="h-4 w-4 mr-2" />
                          Quiz Together
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => startChatWithFriend(friend.user_id)}>
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests" className="space-y-4">
            {receivedRequests.length === 0 && sentRequests.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No pending requests</h3>
                  <p className="text-muted-foreground text-center">
                    Friend requests you send or receive will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Received Requests */}
                {receivedRequests.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Received Requests</h3>
                    {receivedRequests.map((request) => (
                      <Card key={request.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={request.sender?.avatar_url} />
                                <AvatarFallback>
                                  {request.sender?.name?.charAt(0)?.toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-semibold">{request.sender?.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  Sent {new Date(request.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => acceptFriendRequest(request.sender_id)}
                                disabled={isLoading}
                              >
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => rejectFriendRequest(request.sender_id)}
                                disabled={isLoading}
                              >
                                Reject
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Sent Requests */}
                {sentRequests.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Sent Requests</h3>
                    {sentRequests.map((request) => (
                      <Card key={request.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={request.receiver?.avatar_url} />
                              <AvatarFallback>
                                {request.receiver?.name?.charAt(0)?.toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold">{request.receiver?.name}</p>
                              <p className="text-sm text-muted-foreground">
                                Sent {new Date(request.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge variant="secondary" className="ml-auto">
                              Pending
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Find Friends Tab */}
          <TabsContent value="find" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Find Friends</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Search by username..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      searchUsers(e.target.value);
                    }}
                    className="pl-10"
                  />
                </div>

                {isSearching && (
                  <div className="text-center py-4">
                    <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-sm text-muted-foreground mt-2">Searching...</p>
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    {searchResults.map((user) => (
                      <div key={user.user_id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={user.avatar_url} />
                            <AvatarFallback>
                              {user.name?.charAt(0)?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">{user.name}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => sendFriendRequest(user.user_id)}
                          disabled={isLoading}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add Friend
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {searchQuery && !isSearching && searchResults.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No users found matching "{searchQuery}"</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Friends;