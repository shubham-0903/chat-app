import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";

// const SOCKET_URL = 'import.meta.env.VITE_CHAT_SERVER_URL';
const SOCKET_URL = 'http://localhost:3000'

export default function ChatPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const socketRef = useRef(null);

  const [isSearching, setIsSearching] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [partner, setPartner] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");

  const messagesEndRef = useRef(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize socket connection only once
  useEffect(() => {
    if (!user || socketRef.current) {
      return;
    }

    console.log("Initializing socket connection...");

    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    
    socketRef.current = socket;

    // Connection events
    socket.on("connect", () => {
      console.log(" Connected to chat server:", socket.id);
      setIsConnected(true);
      
      // Send user login data to server
      socket.emit("user_login", {
        userId: user._id || user.id,
        username: user.username || user.email
      });
    });

    socket.on("disconnect", (reason) => {
      console.log("Disconnected from server. Reason:", reason);
      setIsConnected(false);
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
      setIsConnected(false);
    });

    socket.on("reconnect", (attemptNumber) => {
      console.log(" Reconnected to server. Attempt:", attemptNumber);
      setIsConnected(true);
      
      // Re-send user login after reconnection
      if (user) {
        socket.emit("user_login", {
          userId: user._id || user.id,
          username: user.username || user.email
        });
      }
    });

    // Chat events
    socket.on("waiting_for_partner", (data) => {
      console.log(" Waiting for partner:", data.message);
      setIsSearching(true);
      setPartner(null);
      setRoomId(null);
      setMessages([]);
    });

    socket.on("chat_started", (data) => {
      console.log("Chat started:", data);
      setIsSearching(false);
      setRoomId(data.roomId);
      setPartner({ 
        id: data.partner, 
        username: data.partner 
      });
      
      // Add system message
      setMessages(prev => [...prev, {
        type: "system",
        text: data.message,
        timestamp: new Date().toISOString()
      }]);
    });

    socket.on("receive_message", (data) => {
      console.log(" Message received:", data);
      setMessages(prev => [...prev, {
        type: "message",
        from: data.fromUserId === (user._id || user.id) ? "user" : "partner",
        username: data.username,
        text: data.message,
        timestamp: data.timestamp
      }]);
    });

    socket.on("partner_left", (data) => {
      console.log(" Partner left:", data);
      setMessages(prev => [...prev, {
        type: "system",
        text: data.message,
        timestamp: new Date().toISOString()
      }]);
      
      // Reset chat after delay
      setTimeout(() => {
        setPartner(null);
        setRoomId(null);
        setIsSearching(false);
        setMessages([]);
      }, 3000);
    });

    socket.on("error", (data) => {
      console.error(" Chat error:", data);
      alert(`Error: ${data.message}`);
      setIsSearching(false);
    });

    socket.on("chat_history", (data) => {
      console.log("Chat history loaded:", data.messages.length, "messages");
      const historyMessages = data.messages.map(msg => ({
        type: "message",
        from: msg.isOwn ? "user" : "partner",
        username: msg.username,
        text: msg.message,
        timestamp: msg.timestamp
      }));
      setMessages(historyMessages);
    });

    socket.on("blocked_user", (data) => {
      console.warn("Blocked user event received:", data);
      setIsSearching(false);
      setPartner(null);
      setRoomId(null);
      setMessages([]);

      // Show an alert or message to the user
      alert( "You are temporarily blocked from chatting.");
    });

    socket.on("partner_blocked", (data) => {
      console.warn("Partner blocked:", data);
      setIsSearching(false);
      setPartner(null);
      setRoomId(null);
      setMessages([]);

      // Show an alert or message to the user
      alert( "Your partner is temporarily blocked from chatting.");
    });

    // Cleanup function
    return () => {
      console.log(" Cleaning up socket connection");
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user]); // Only depend on user

  const findChat = () => {
    if (!socketRef.current || !isConnected) {
      alert("Not connected to server");
      return;
    }

    socketRef.current.emit("find_chat", {
      userId: user._id || user.id,
      username: user.username || user.email
    });
    setIsSearching(true);
    setPartner(null);
    setRoomId(null);
    setMessages([]);
  };

  const sendMessage = () => {
    const text = messageInput.trim();
    if (!text || !roomId || !socketRef.current || !isConnected) {
      console.log("Cannot send message:", { text, roomId, socket: !!socketRef.current, connected: isConnected });
      return;
    }

    console.log("Sending message:", text);

    try {
      // Emit message to server
      socketRef.current.emit("send_message", {
        roomId,
        message: text,
        username: user.username || user.email
      });

      // Add message to local state immediately
      setMessages(prev => [...prev, {
        type: "message",
        from: "user",
        username: user.username || user.email,
        text: text,
        timestamp: new Date().toISOString()
      }]);

      setMessageInput("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const endChat = () => {
    if (roomId && socketRef.current && isConnected) {
      socketRef.current.emit("end_chat", {
        roomId,
        userId: user._id || user.id
      });
    }
    setPartner(null);
    setRoomId(null);
    setIsSearching(false);
    setMessages([]);
  };

  const cancelSearch = () => {
    setIsSearching(false);
    setMessages([]);
  };

  // Format timestamp for display
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-4 shadow-md bg-white">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-gray-800">ChatApp</h1>
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-600">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          {socketRef.current && (
            <span className="text-xs text-gray-500">ID: {socketRef.current.id}</span>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {user && (
            <span className="text-gray-700">Welcome, {user.username || user.email}</span>
          )}
          <button
            onClick={() => navigate("/")}
            className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-md transition-colors"
          >
            Exit
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col p-6">
        {!partner && !isSearching ? (
          // Start chat screen
          <div className="flex flex-col items-center justify-center flex-1 space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                Ready to Chat?
              </h2>
              <p className="text-gray-600 max-w-md">
                Click the button below to find a random chat partner and start a conversation.
              </p>
              {!isConnected && (
                <p className="text-red-500 mt-2"> Not connected to server</p>
              )}
            </div>
            <button
              onClick={findChat}
              disabled={!isConnected}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold px-8 py-3 rounded-full transition-colors text-lg"
            >
              {isConnected ? "Find Random Chat" : "Connecting..."}
            </button>
          </div>
        ) : isSearching ? (
          // Searching screen
          <div className="flex flex-col items-center justify-center flex-1 space-y-6">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
            <div className="text-center">
              <h3 className="text-2xl font-semibold text-gray-800 mb-2">
                Looking for a Partner
              </h3>
              <p className="text-gray-600">
                Please wait while we find someone for you to chat with...
              </p>
            </div>
            <button
              onClick={cancelSearch}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded-md transition-colors"
            >
              Cancel Search
            </button>
          </div>
        ) : (
          // Chat screen
          <div className="flex flex-col h-full max-w-4xl mx-auto w-full bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Chat header */}
            <div className="bg-blue-600 text-white px-6 py-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">
                    Chat with {partner?.username}
                  </h3>
                  <p className="text-blue-100 text-sm">
                    Room: {roomId}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={endChat}
                    className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-md text-sm transition-colors"
                  >
                    End Chat
                  </button>
                </div>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-96">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${
                    msg.type === "system" 
                      ? "justify-center" 
                      : msg.from === "user" 
                        ? "justify-end" 
                        : "justify-start"
                  }`}
                >
                  {msg.type === "system" ? (
                    <div className="bg-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm">
                      {msg.text}
                    </div>
                  ) : (
                    <div
                      className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                        msg.from === "user"
                          ? "bg-blue-600 text-white rounded-br-none"
                          : "bg-gray-200 text-gray-800 rounded-bl-none"
                      }`}
                    >
                      <div className="text-sm font-semibold opacity-80">
                        {msg.username}
                      </div>
                      <div className="my-1">{msg.text}</div>
                      <div className="text-xs opacity-70 text-right">
                        {formatTime(msg.timestamp)}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex space-x-3">
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  className="flex-1 border border-gray-300 rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={sendMessage}
                  disabled={!messageInput.trim() || !isConnected}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold px-6 py-3 rounded-full transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}