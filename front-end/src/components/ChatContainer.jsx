import React, { useEffect, useState, useRef } from "react";
import { FaArrowLeft } from "react-icons/fa6";
import ChatLists from "./ChatLists";
import InputText from "./InputText";
import UserLogin from "./UserLogin";
import UserList from "./UserList";
import socketIOClient from "socket.io-client";

const ChatContainer = () => {
  const [user, setUser] = useState(localStorage.getItem("user"));
  const socketRef = useRef(null);
  const isConnectedRef = useRef(false);
  const [chats, setChats] = useState([]);
  const [users, setUsers] = useState([]);
  const [chatUsers, setChatUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const selectedUserRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    if (!socketRef.current || !isConnectedRef.current) {
      socketRef.current = socketIOClient("https://chat-2-nthh.onrender.com/", {
        transports: ['websocket', 'polling'],})
      // socketRef.current = socketIOClient(window.location.origin, {
      //   path: '/socket.io',
      //   transports: ['websocket', 'polling']
      // });
      isConnectedRef.current = true;
    }

    const socket = socketRef.current;

    socket.emit('userLogin', {
      username: user,
      avatar: localStorage.getItem("avatar")
    });

    socket.emit('getChatUsers', user);

    const handleUsersList = (usersList) => {
      setUsers(usersList);
    };

    const handleChatUsersList = (chatUsersList) => {
      setChatUsers(chatUsersList);
    };

    const handleChatHistory = (messages) => {
      setChats(messages);
    };

    const handleReceiveMessage = (msg) => {
      const currentSelected = selectedUserRef.current;
      if ((msg.sender === currentSelected && msg.receiver === user) || 
          (msg.sender === user && msg.receiver === currentSelected)) {
        setChats((prevChats) => [...prevChats, msg]);
      }
      socket.emit('getChatUsers', user);
    };

    const handleUserOnline = (data) => {
      setUsers(prevUsers => prevUsers.map(u => 
        u.username === data.username ? { ...u, online: data.online } : u
      ));
    };

    const handleUserOffline = (data) => {
      setUsers(prevUsers => prevUsers.map(u => 
        u.username === data.username ? { ...u, online: data.online } : u
      ));
    };

    socket.on('usersList', handleUsersList);
    socket.on('chatUsersList', handleChatUsersList);
    socket.on('chatHistory', handleChatHistory);
    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('userOnline', handleUserOnline);
    socket.on('userOffline', handleUserOffline);

    return () => {
      socket.off('usersList', handleUsersList);
      socket.off('chatUsersList', handleChatUsersList);
      socket.off('chatHistory', handleChatHistory);
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('userOnline', handleUserOnline);
      socket.off('userOffline', handleUserOffline);
      
      if (!user && socketRef.current && isConnectedRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        isConnectedRef.current = false;
      }
    };
  }, [user]);

  const handleSelectUser = (username) => {
    setSelectedUser(username);
    selectedUserRef.current = username;
    if (socketRef.current) {
      socketRef.current.emit('loadMessages', {
        currentUser: user,
        selectedUser: username
      });
    }
  };

  const addMessage = (message) => {
    if (!selectedUser || !socketRef.current) return;
    
    const newMessage = {
      sender: user,
      receiver: selectedUser,
      message: message,
      senderAvatar: localStorage.getItem("avatar"),
    };
    socketRef.current.emit('privateMessage', newMessage);
  };

  const Logout = () => {
    if (socketRef.current && isConnectedRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      isConnectedRef.current = false;
    }
    setSelectedUser(null);
    selectedUserRef.current = null;
    setChats([]);
    setUsers([]);
    setChatUsers([]);
    localStorage.removeItem("user");
    localStorage.removeItem('avatar');
    setUser('');
  }

  return (
    <div>
      {user ? (
        <div className="home">
          <div className="chat_layout">
            <div className="sidebar">
              <div className="sidebar_header">
                <h3>{user}</h3>
                <button className="logout_btn" onClick={Logout}>Logout</button>
              </div>
              <UserList 
                users={users}
                chatUsers={chatUsers}
                onSelectUser={handleSelectUser}
                selectedUser={selectedUser}
                currentUser={user}
              />
            </div>

            <div className="chat_section">
              {selectedUser ? (
                <>
                  <div className="chat_header">
                    <button className="back_btn" onClick={() => setSelectedUser(null)}>
                      <FaArrowLeft />
                    </button>
                    <img 
                      src={users.find(u => u.username === selectedUser)?.avatar || chatUsers.find(u => u.username === selectedUser)?.avatar} 
                      alt={selectedUser} 
                      className="chat_header_avatar" 
                    />
                    <div className="chat_user_info">
                      <h4>{selectedUser}</h4>
                      <span className="user_status_text">
                        {users.find(u => u.username === selectedUser)?.online ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                  <ChatLists chats={chats} currentUser={user} />
                  <InputText addMessage={addMessage} />
                </>
              ) : (
                <div className="no_chat_selected">
                  <h2>Select a user to start chatting</h2>
                  <p>Choose from your chat history or all users</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <UserLogin setUser={setUser} />
      )}
    </div>
  );
};

export default ChatContainer;
