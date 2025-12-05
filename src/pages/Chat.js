import React, { useState, useEffect, useRef, useContext, useCallback } from "react";
import { AuthContext } from "../context/AuthContext";
import api from "../utils/api";
import { getSocket } from "../utils/socket";

const Chat = () => {
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const activeChatRef = useRef(activeChat);

  // Keep ref in sync with state
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  const socket = getSocket();

  // Get current user ID (handle both id and _id)
  const currentUserId = user?.id || user?._id;

  // Fetch all users for chat list
  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get("/chat/users");
      setUsers(res.data.data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch messages for active chat
  const fetchMessages = useCallback(async (conversationId) => {
    if (!conversationId) return;
    try {
      const res = await api.get(`/chat/conversations/${conversationId}/messages`);
      setMessages(res.data.data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  }, []);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, []);

  // Initialize socket listeners
  useEffect(() => {
    fetchUsers();

    if (socket) {
      // Handle incoming messages
      const handleNewMessage = (data) => {
        console.log("New message received:", data);
        const currentActiveChat = activeChatRef.current;
        if (data.conversationId === currentActiveChat?.conversationId) {
          setMessages((prev) => {
            // Avoid duplicates
            const exists = prev.some(m => m._id === data.message._id);
            if (exists) return prev;
            return [...prev, data.message];
          });
          scrollToBottom();
        }
        // Refresh user list to update last message
        fetchUsers();
      };

      const handleTyping = (data) => {
        const currentActiveChat = activeChatRef.current;
        if (data.conversationId === currentActiveChat?.conversationId) {
          setTyping(data.userName);
          setTimeout(() => setTyping(null), 3000);
        }
      };

      const handleStopTyping = () => {
        setTyping(null);
      };

      const handleUserOnline = (data) => {
        if (data.userId) {
          setOnlineUsers((prev) => [...new Set([...prev, data.userId])]);
        }
      };

      const handleUserOffline = (data) => {
        if (data.userId) {
          setOnlineUsers((prev) => prev.filter((id) => id !== data.userId));
        }
      };

      socket.on("new-message", handleNewMessage);
      socket.on("user-typing", handleTyping);
      socket.on("user-stopped-typing", handleStopTyping);
      socket.on("user-online", handleUserOnline);
      socket.on("user-offline", handleUserOffline);

      // Subscribe to notifications
      socket.emit("subscribe-notifications");

      return () => {
        socket.off("new-message", handleNewMessage);
        socket.off("user-typing", handleTyping);
        socket.off("user-stopped-typing", handleStopTyping);
        socket.off("user-online", handleUserOnline);
        socket.off("user-offline", handleUserOffline);
      };
    }
  }, [socket, fetchUsers, scrollToBottom]);

  // Handle active chat changes
  useEffect(() => {
    if (activeChat?.conversationId) {
      fetchMessages(activeChat.conversationId).then(() => {
        // Refresh user list to update unread counts after messages are marked as read
        fetchUsers();
      });
      socket?.emit("join-conversation", activeChat.conversationId);
      scrollToBottom();
    }
    return () => {
      if (activeChat?.conversationId) {
        socket?.emit("leave-conversation", activeChat.conversationId);
      }
    };
  }, [activeChat?.conversationId, fetchMessages, fetchUsers, socket, scrollToBottom]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Start or open chat with a user
  const startChat = async (selectedUser) => {
    try {
      if (selectedUser.conversationId) {
        // Immediately update local state to show 0 unread for this user
        setUsers(prev => prev.map(u => 
          u._id === selectedUser._id ? { ...u, unreadCount: 0 } : u
        ));
        setActiveChat({ ...selectedUser, unreadCount: 0 });
        setMessages([]);
      } else {
        const res = await api.post("/chat/conversations", {
          recipientId: selectedUser._id,
        });
        const newChat = {
          ...selectedUser,
          conversationId: res.data.data._id,
          unreadCount: 0
        };
        setActiveChat(newChat);
        setMessages([]);
        fetchUsers();
      }
    } catch (error) {
      console.error("Error starting chat:", error);
    }
  };

  // Send message
  const sendMessage = async (e) => {
    e.preventDefault();
    const messageText = newMessage.trim();
    if (!messageText || !activeChat?.conversationId || sending) return;

    setSending(true);
    
    // Clear input immediately for better UX
    setNewMessage("");
    
    try {
      const res = await api.post(
        `/chat/conversations/${activeChat.conversationId}/messages`,
        { content: messageText }
      );

      if (res.data.success && res.data.data) {
        // Add message to local state
        setMessages((prev) => [...prev, res.data.data]);
        scrollToBottom();

        // Emit via socket for real-time to other user
        if (socket) {
          socket.emit("send-message", {
            conversationId: activeChat.conversationId,
            message: res.data.data,
            recipientId: activeChat._id,
          });
        }

        // Update user list
        fetchUsers();
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Restore message on error
      setNewMessage(messageText);
      alert("Failed to send message. Please try again.");
    } finally {
      setSending(false);
      // Focus back on input
      inputRef.current?.focus();
    }
  };

  // Typing indicators
  let typingTimeout = null;
  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    
    if (activeChat?.conversationId && socket) {
      socket.emit("typing-start", activeChat.conversationId);
      
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        socket.emit("typing-stop", activeChat.conversationId);
      }, 1000);
    }
  };

  // Check if message is from current user
  const isMyMessage = (msg) => {
    const senderId = msg.sender?._id || msg.sender;
    return senderId === currentUserId || senderId?.toString() === currentUserId?.toString();
  };

  // Filter users by search
  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.subtitle?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Format time
  const formatTime = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;

    if (diff < 86400000) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diff < 604800000) {
      return d.toLocaleDateString([], { weekday: "short" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-140px)] bg-gray-100 md:rounded-xl overflow-hidden shadow-sm">
      {/* Users List - Hidden on mobile when chat is active */}
      <div className={`${activeChat ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 lg:w-1/4 bg-white border-r flex-col`}>
        <div className="p-3 md:p-4 bg-gray-50 border-b">
          <h2 className="text-lg md:text-xl font-semibold text-gray-800">Chats</h2>
          <p className="text-xs md:text-sm text-gray-500">
            {user?.role === "doctor" ? "Medical Representatives" : "Doctors"}
          </p>
        </div>

        <div className="p-2 md:p-3 border-b">
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 md:pl-10 pr-4 py-2 text-sm bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredUsers.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">No users found</div>
          ) : (
            filteredUsers.map((u) => (
              <div
                key={u._id}
                onClick={() => startChat(u)}
                className={`flex items-center p-2 md:p-3 cursor-pointer hover:bg-gray-50 border-b transition ${
                  activeChat?._id === u._id ? "bg-blue-50" : ""
                }`}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm md:text-lg">
                    {u.name?.charAt(0).toUpperCase()}
                  </div>
                  {onlineUsers.includes(u._id) && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 md:w-3 md:h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>

                <div className="ml-2 md:ml-3 flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium text-gray-800 truncate text-sm md:text-base">
                      {user?.role === "mr" ? "Dr. " : ""}{u.name}
                    </h3>
                    <div className="flex items-center space-x-1 md:space-x-2 flex-shrink-0">
                      {u.lastMessageTime && (
                        <span className="text-xs text-gray-400 hidden sm:inline">{formatTime(u.lastMessageTime)}</span>
                      )}
                      {u.unreadCount > 0 && (
                        <span className="bg-blue-500 text-white text-xs font-bold px-1.5 md:px-2 py-0.5 rounded-full min-w-[18px] md:min-w-[20px] text-center">
                          {u.unreadCount > 99 ? '99+' : u.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className={`text-xs md:text-sm truncate ${u.unreadCount > 0 ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
                    {u.lastMessage?.content || u.subtitle || "Start a conversation"}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {activeChat ? (
          <>
            {/* Header */}
            <div className="p-4 bg-white border-b flex items-center shadow-sm">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {activeChat.name?.charAt(0).toUpperCase()}
                </div>
                {onlineUsers.includes(activeChat._id) && (
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>
                )}
              </div>
              <div className="ml-3">
                <h3 className="font-medium text-gray-800">
                  {user?.role === "mr" ? "Dr. " : ""}{activeChat.name}
                </h3>
                <p className="text-sm text-gray-500">
                  {typing ? "typing..." : onlineUsers.includes(activeChat._id) ? "Online" : activeChat.subtitle || ""}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-100">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-500">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p>No messages yet</p>
                    <p className="text-sm">Send a message to start the conversation</p>
                  </div>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={msg._id || idx}
                    className={`flex ${isMyMessage(msg) ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow-sm ${
                        isMyMessage(msg)
                          ? "bg-blue-600 text-white rounded-br-none"
                          : "bg-white text-gray-800 rounded-bl-none"
                      }`}
                    >
                      <p className="break-words">{msg.content}</p>
                      <div className={`flex items-center justify-end mt-1 space-x-1 ${
                        isMyMessage(msg) ? "text-blue-200" : "text-gray-400"
                      }`}>
                        <span className="text-xs">
                          {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                        </span>
                        {isMyMessage(msg) && (
                          <span className="text-xs">{msg.read ? "✓✓" : "✓"}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="p-4 bg-white border-t">
              <div className="flex items-center space-x-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={handleInputChange}
                  placeholder="Type a message..."
                  disabled={sending}
                  className="flex-1 px-4 py-3 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {sending ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-gray-800 mb-2">MRAlo Chat</h3>
              <p className="text-gray-500">
                Select a {user?.role === "doctor" ? "Medical Representative" : "Doctor"} to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
