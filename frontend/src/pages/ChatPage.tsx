import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { EncryptionService } from '../utils/encryption';
import CallModal from '../components/CallModal';
import { getApiBaseUrl, getWsBaseUrl } from '../utils/runtimeConfig';
import './ChatPage.css';

interface ChatRoom {
  chatRoomId: string;
  type: 'personal' | 'group';
  participants: Array<{
    userId: string;
    name: string;
    profession: string;
  }>;
  lastMessage: {
    encryptedContent: string;
    timestamp: Date;
    senderId: string;
  } | null;
  lastMessageAt: Date;
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  encryptedContent: string;
  timestamp: Date;
  delivered: boolean;
  read: boolean;
  deletedForEveryone?: boolean;
}

const CIPHERTEXT_PLACEHOLDER = '[Encrypted message - not readable on this device]';
const DELETED_MESSAGE_TEXT = 'This message was deleted';

const isLikelyCiphertext = (text: string): boolean => {
  if (!text) return false;
  // Base64-like long payloads are likely encrypted RSA output.
  return text.length > 80 && /^[A-Za-z0-9+/=]+$/.test(text);
};

const ChatPage = () => {
  const navigate = useNavigate();
  const { friendshipId } = useParams();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedChatRoom, setSelectedChatRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [encryptionReady, setEncryptionReady] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [currentCall, setCurrentCall] = useState<{
    callId: string;
    type: 'voice' | 'video';
    isIncoming: boolean;
    callerName?: string;
    callerId?: string;
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    messageId: string;
    isOwn: boolean;
  } | null>(null);
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [chatSearch, setChatSearch] = useState('');
  const [isMobileView, setIsMobileView] = useState(false);
  const [showSidebarOnMobile, setShowSidebarOnMobile] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<Socket | null>(null);
  const selectedChatRoomRef = useRef<ChatRoom | null>(null);
  const typingStopTimeoutRef = useRef<number | null>(null);

  const API_URL = getApiBaseUrl();
  const WS_URL = getWsBaseUrl();
  const currentUserId = localStorage.getItem('userId');
  const currentUserIdStr = String(currentUserId || '');

  const getOtherParticipant = (room: ChatRoom) =>
    room.participants.find((p) => String(p.userId) !== currentUserIdStr);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    initializeEncryption();
    loadChatRooms();
    setupWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (selectedChatRoom) {
      loadMessages(selectedChatRoom.chatRoomId);
    }
  }, [selectedChatRoom]);

  useEffect(() => {
    selectedChatRoomRef.current = selectedChatRoom;
    setIsPeerTyping(false);
  }, [selectedChatRoom]);

  useEffect(() => {
    if (!selectedChatRoom) return;

    // Fallback sync for tunnel/mobile cases when socket delivery is delayed.
    const interval = setInterval(() => {
      loadMessages(selectedChatRoom.chatRoomId);
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedChatRoom?.chatRoomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobileView(mobile);

      if (!mobile) {
        setShowSidebarOnMobile(true);
      } else if (!selectedChatRoomRef.current) {
        setShowSidebarOnMobile(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const initializeEncryption = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Get or generate key pair
      await EncryptionService.getKeyPair();
      
      // Upload public key to server
      await EncryptionService.uploadPublicKey(API_URL, token);
      
      setEncryptionReady(true);
      console.log('Encryption initialized');
    } catch (error) {
      console.error('Failed to initialize encryption:', error);
      // Continue without encryption
      setEncryptionReady(true);
    }
  };

  const setupWebSocket = () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Connect to WebSocket server
    const socket = io(WS_URL, {
      auth: { token },
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 500
    });

    socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    // Listen for incoming messages
    socket.on('message:receive', async (data: any) => {
      console.log('Received message:', data);
      
      try {
        // Decrypt the message
        const keyPair = await EncryptionService.getKeyPair();
        const decryptedContent = await EncryptionService.decryptMessage(
          data.encryptedContent,
          keyPair.privateKey
        );

        // Add message to state if it's for the current chat
        if (selectedChatRoomRef.current && data.chatRoomId === selectedChatRoomRef.current.chatRoomId) {
          const newMessage: Message = {
            id: data.messageId,
            senderId: data.senderId,
            receiverId: currentUserId!,
            encryptedContent: decryptedContent,
            timestamp: new Date(data.timestamp),
            delivered: true,
            read: false
          };
        setMessages(prev => [...prev, newMessage]);
      }

        // Refresh chat list to update last message
        loadChatRooms();
      } catch (error) {
        console.error('Failed to decrypt message:', error);
        if (selectedChatRoomRef.current && data.chatRoomId === selectedChatRoomRef.current.chatRoomId) {
          const unreadableMessage: Message = {
            id: data.messageId,
            senderId: data.senderId,
            receiverId: currentUserId!,
            encryptedContent: CIPHERTEXT_PLACEHOLDER,
            timestamp: new Date(data.timestamp),
            delivered: true,
            read: false
          };
          setMessages(prev => [...prev, unreadableMessage]);
        }
      }
    });

    socket.on('error', (error: any) => {
      console.error('WebSocket error:', error);
    });

    socket.on('message:deleted_for_everyone', (data: any) => {
      setMessages((prev) =>
        prev.map((msg) =>
          String(msg.id) === String(data.messageId)
            ? { ...msg, encryptedContent: DELETED_MESSAGE_TEXT, deletedForEveryone: true }
            : msg
        )
      );
    });

    socket.on('typing:start', (data: any) => {
      const activeRoom = selectedChatRoomRef.current;
      if (!activeRoom) return;
      if (data?.chatRoomId === activeRoom.chatRoomId) {
        setIsPeerTyping(true);
      }
    });

    socket.on('typing:stop', (data: any) => {
      const activeRoom = selectedChatRoomRef.current;
      if (!activeRoom) return;
      if (data?.chatRoomId === activeRoom.chatRoomId) {
        setIsPeerTyping(false);
      }
    });

    // Listen for incoming calls
    socket.on('call:incoming', (data: any) => {
      console.log('Incoming call:', data);
      setCurrentCall({
        callId: data.callId,
        type: data.type,
        isIncoming: true,
        callerName: data.initiatorName,
        callerId: String(data.initiatorId || '')
      });
      setShowCallModal(true);
    });

    wsRef.current = socket;
  };

  const loadChatRooms = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/messages/chats`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setChatRooms(data.chats || []);
        
        // If friendshipId is provided, select that chat
        if (friendshipId && data.chats.length > 0) {
          const chat = data.chats.find((c: ChatRoom) => 
            c.participants.some(p => String(p.userId) === String(friendshipId))
          );
          if (chat) {
            setSelectedChatRoom(chat);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load chat rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (chatRoomId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/messages/chat/${chatRoomId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Decrypt all messages
        const keyPair = await EncryptionService.getKeyPair();
        const decryptedMessages = await Promise.all(
          (data.messages || []).map(async (msg: Message) => {
            try {
              if (msg.deletedForEveryone) {
                return { ...msg, encryptedContent: DELETED_MESSAGE_TEXT, deletedForEveryone: true };
              }
              const decryptedContent = await EncryptionService.decryptMessage(
                msg.encryptedContent,
                keyPair.privateKey
              );
              return { ...msg, encryptedContent: decryptedContent };
            } catch (error) {
              console.error('Failed to decrypt message:', error);
              if (msg.deletedForEveryone) {
                return { ...msg, encryptedContent: DELETED_MESSAGE_TEXT, deletedForEveryone: true };
              }
              return { ...msg, encryptedContent: CIPHERTEXT_PLACEHOLDER };
            }
          })
        );
        
        setMessages(decryptedMessages);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedChatRoom || sending || !encryptionReady) return;

    setSending(true);
    try {
      const token = localStorage.getItem('token');
      const receiverId = selectedChatRoom.participants.find(
        p => String(p.userId) !== currentUserIdStr
      )?.userId;

      if (!receiverId) {
        console.error('No receiver found');
        return;
      }

      // Encrypt for receiver and sender (sender must read own history later).
      let encryptedContent: string;
      let senderEncryptedContent: string;
      try {
        const keyPair = await EncryptionService.getKeyPair();
        const recipientPublicKey = await EncryptionService.getRecipientPublicKey(
          receiverId,
          API_URL,
          token!
        );
        encryptedContent = await EncryptionService.encryptMessage(
          messageInput,
          recipientPublicKey
        );
        senderEncryptedContent = await EncryptionService.encryptMessage(
          messageInput,
          keyPair.publicKey
        );
      } catch (error) {
        console.error('Encryption failed:', error);
        alert('Could not encrypt message. Please refresh and try again.');
        return;
      }

      const response = await fetch(`${API_URL}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          receiverId,
          encryptedContent,
          senderEncryptedContent,
          chatRoomId: selectedChatRoom.chatRoomId
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Add message to local state (store decrypted version locally)
        const newMessage: Message = {
          id: data.messageData.id,
          senderId: currentUserId!,
          receiverId,
          encryptedContent: messageInput, // Store decrypted for display
          timestamp: new Date(data.messageData.timestamp),
          delivered: data.messageData.delivered,
          read: false,
          deletedForEveryone: false
        };
        setMessages(prev => [...prev, newMessage]);
        setMessageInput('');
        emitTypingState(false);
        if (typingStopTimeoutRef.current) {
          window.clearTimeout(typingStopTimeoutRef.current);
          typingStopTimeoutRef.current = null;
        }
        setIsPeerTyping(false);
      } else {
        const error = await response.json();
        alert(error.error?.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const emitTypingState = (isTyping: boolean) => {
    const activeRoom = selectedChatRoomRef.current;
    if (!activeRoom || !wsRef.current) return;
    const normalizedTargetUserId = activeRoom.participants.find(
      (p) => String(p.userId) !== currentUserIdStr
    )?.userId;
    if (!normalizedTargetUserId) return;

    wsRef.current.emit(isTyping ? 'typing:start' : 'typing:stop', {
      targetUserId: normalizedTargetUserId,
      chatRoomId: activeRoom.chatRoomId
    });
  };

  const handleMessageInputChange = (value: string) => {
    setMessageInput(value);
    if (!selectedChatRoomRef.current) return;

    if (value.trim()) {
      emitTypingState(true);
      if (typingStopTimeoutRef.current) {
        window.clearTimeout(typingStopTimeoutRef.current);
      }
      typingStopTimeoutRef.current = window.setTimeout(() => {
        emitTypingState(false);
      }, 1200);
    } else {
      emitTypingState(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (d.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const initiateCall = async (type: 'voice' | 'video') => {
    if (!selectedChatRoom) return;

    const friendId = selectedChatRoom.participants.find(
      p => String(p.userId) !== currentUserIdStr
    )?.userId;
    const friendName =
      selectedChatRoom.participants.find((p) => String(p.userId) !== currentUserIdStr)?.name ||
      'Unknown';

    if (!friendId) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/calls/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          participantId: friendId,
          type
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentCall({
          callId: data.call.id,
          type,
          isIncoming: false,
          callerId: String(friendId),
          callerName: friendName
        });
        setShowCallModal(true);
      } else {
        const error = await response.json();
        alert(error.error?.message || 'Failed to initiate call');
      }
    } catch (error) {
      console.error('Failed to initiate call:', error);
      alert('Failed to initiate call');
    }
  };

  const handleAcceptCall = () => {
    console.log('Call accepted');
  };

  const handleRejectCall = () => {
    setShowCallModal(false);
    setCurrentCall(null);
  };

  const handleEndCall = async () => {
    if (currentCall) {
      try {
        const token = localStorage.getItem('token');
        await fetch(`${API_URL}/api/calls/${currentCall.callId}/end`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (error) {
        console.error('Failed to end call:', error);
      }
    }
    setShowCallModal(false);
    setCurrentCall(null);
  };

  const filteredChatRooms = chatRooms.filter((room) => {
    const other = getOtherParticipant(room);
    const haystack = `${other?.name || ''} ${other?.profession || ''}`.toLowerCase();
    return haystack.includes(chatSearch.toLowerCase());
  });

  const handleMessageContextMenu = (
    event: React.MouseEvent,
    message: Message,
    isOwnMessage: boolean
  ) => {
    event.preventDefault();
    if (message.deletedForEveryone) return;
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      messageId: message.id,
      isOwn: isOwnMessage
    });
  };

  const deleteForMe = async () => {
    if (!contextMenu) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/messages/${contextMenu.messageId}/me`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        setMessages((prev) => prev.filter((m) => String(m.id) !== String(contextMenu.messageId)));
      }
    } catch (error) {
      console.error('Delete for me failed:', error);
    } finally {
      setContextMenu(null);
    }
  };

  const deleteForEveryone = async () => {
    if (!contextMenu || !contextMenu.isOwn) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/messages/${contextMenu.messageId}/everyone`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        setMessages((prev) =>
          prev.map((m) =>
            String(m.id) === String(contextMenu.messageId)
              ? { ...m, encryptedContent: DELETED_MESSAGE_TEXT, deletedForEveryone: true }
              : m
          )
        );
      }
    } catch (error) {
      console.error('Delete for everyone failed:', error);
    } finally {
      setContextMenu(null);
    }
  };

  return (
    <div className="chat-page">
      <div className="chat-container">
        {/* Chat List Sidebar */}
        <div className={`chat-list-sidebar ${isMobileView && showSidebarOnMobile ? 'mobile-visible' : ''}`}>
          <div className="chat-list-header">
            <button className="back-button" onClick={() => navigate('/home')}>
              Back
            </button>
            <h2>Messages</h2>
            <input
              className="chat-search-input"
              type="text"
              placeholder="Search chats..."
              value={chatSearch}
              onChange={(e) => setChatSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="chat-list-loading">Loading chats...</div>
          ) : filteredChatRooms.length === 0 ? (
            <div className="no-chats">
              <p>No matching chats</p>
              <p className="subtitle">Try a different name or profession.</p>
            </div>
          ) : (
            <div className="chat-list">
              {filteredChatRooms.map((room) => {
                const otherParticipant = room.participants.find(
                  p => String(p.userId) !== currentUserIdStr
                );
                const isSelected = selectedChatRoom?.chatRoomId === room.chatRoomId;

                return (
                  <div
                    key={room.chatRoomId}
                    className={`chat-list-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedChatRoom(room);
                      if (isMobileView) setShowSidebarOnMobile(false);
                    }}
                  >
                    <div className="chat-list-item-info">
                      <h3>{otherParticipant?.name || 'Unknown'}</h3>
                      <p className="profession">{otherParticipant?.profession}</p>
                      {room.lastMessage && (
                        <p className="last-message">
                          {isLikelyCiphertext(room.lastMessage.encryptedContent)
                            ? 'Encrypted message'
                            : `${room.lastMessage.encryptedContent.substring(0, 30)}${
                                room.lastMessage.encryptedContent.length > 30 ? '...' : ''
                              }`}
                        </p>
                      )}
                    </div>
                    {room.lastMessageAt && (
                      <span className="last-message-time">
                        {formatDate(new Date(room.lastMessageAt))}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Chat Window */}
        <div className={`chat-window ${isMobileView && showSidebarOnMobile ? 'mobile-hidden' : ''}`}>
          {selectedChatRoom ? (
            <>
              <div className="chat-window-header">
                {isMobileView && (
                  <button
                    className="back-to-chats-button"
                    onClick={() => setShowSidebarOnMobile(true)}
                  >
                    Chats
                  </button>
                )}
                <div className="chat-header-info">
                  <h2>
                    {selectedChatRoom.participants
                      .filter(p => String(p.userId) !== currentUserIdStr)
                      .map(p => p.name)
                      .join(', ')}
                  </h2>
                  <div className="encryption-indicator">
                    <span className="lock-icon">🔒</span>
                    <span>End-to-end encrypted</span>
                  </div>
                  {isPeerTyping && <div className="typing-indicator">Typing...</div>}
                </div>
                <div className="call-buttons">
                  <button
                    className="call-button"
                    onClick={() => initiateCall('voice')}
                    title="Voice call"
                  >
                    Call
                  </button>
                  <button
                    className="call-button"
                    onClick={() => initiateCall('video')}
                    title="Video call"
                  >
                    Video
                  </button>
                </div>
              </div>

              <div className="messages-container">
                {messages.map((message, index) => {
                  const isOwnMessage = String(message.senderId) === currentUserIdStr;
                  const showDate = index === 0 || 
                    formatDate(new Date(messages[index - 1].timestamp)) !== 
                    formatDate(new Date(message.timestamp));

                  return (
                    <div key={message.id}>
                      {showDate && (
                        <div className="message-date-divider">
                          {formatDate(new Date(message.timestamp))}
                        </div>
                      )}
                      <div className={`message ${isOwnMessage ? 'own' : 'other'}`}>
                        <div
                          className={`message-content ${message.deletedForEveryone ? 'deleted' : ''}`}
                          onContextMenu={(e) => handleMessageContextMenu(e, message, isOwnMessage)}
                        >
                          {message.encryptedContent}
                        </div>
                        <div className="message-meta">
                          <span className="message-time">
                            {formatTime(message.timestamp)}
                          </span>
                          {isOwnMessage && (
                            <span className="message-status">
                              {message.read ? '✓✓' : message.delivered ? '✓' : '○'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="message-input-container">
                <textarea
                  className="message-input"
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => handleMessageInputChange(e.target.value)}
                  onKeyDown={handleKeyPress}
                  rows={1}
                  disabled={sending}
                />
                <button
                  className="send-button"
                  onClick={sendMessage}
                  disabled={!messageInput.trim() || sending}
                >
                  {sending ? '...' : 'Send'}
                </button>
              </div>
            </>
          ) : (
            <div className="no-chat-selected">
              <p>Select a chat to start messaging</p>
            </div>
          )}
        </div>
      </div>

      {/* Call Modal */}
      {showCallModal && currentCall && (
        <CallModal
          callId={currentCall.callId}
          callType={currentCall.type}
          isIncoming={currentCall.isIncoming}
          callerName={currentCall.callerName}
          callerId={currentCall.callerId}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
          onEnd={handleEndCall}
          socket={wsRef.current}
        />
      )}

      {contextMenu && (
        <div
          className="message-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.isOwn && (
            <button className="context-item danger" onClick={deleteForEveryone}>
              Delete for everyone
            </button>
          )}
          <button className="context-item" onClick={deleteForMe}>
            Delete for me
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatPage;


