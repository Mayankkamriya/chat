const express = require('express')
const http = require('http')
const Server = require('socket.io').Server
const Connection = require('./db.js')
const mongoose = require("mongoose")
const Chat = require('./models/Chat.js')
const User = require('./models/User.js')
const dotenv = require('dotenv');
dotenv.config();
const app = express()
app.use(express.json())
Connection()
const server = http.createServer(app)
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling']
})

io.on("connection", (socket) => {
    console.log("connected");

    socket.on('userLogin', async (userData) => {
        try {
            let user = await User.findOne({ username: userData.username })
            if (!user) {
                user = new User({
                    username: userData.username,
                    avatar: userData.avatar,
                    socketId: socket.id,
                    online: true
                })
                await user.save()
            } else {
                user.socketId = socket.id
                user.online = true
                user.lastSeen = new Date()
                await user.save()
            }
            
            socket.username = userData.username
            
            const allUsers = await User.find({ username: { $ne: userData.username } }).select('username avatar online')
            socket.emit('usersList', allUsers)
            socket.broadcast.emit('userOnline', { username: userData.username, online: true })
        } catch(err) {
            console.log(err)
        }
    })

    socket.on('getUsers', async () => {
        try {
            const users = await User.find().select('username avatar online')
            socket.emit('usersList', users)
        } catch(err) {
            console.log(err)
        }
    })

    socket.on('loadMessages', async (data) => {
        try {
            const roomId = [data.currentUser, data.selectedUser].sort().join('-')
            socket.join(roomId)
            
            const messages = await Chat.find({
                $or: [
                    { sender: data.currentUser, receiver: data.selectedUser },
                    { sender: data.selectedUser, receiver: data.currentUser }
                ]
            }).sort({ timestamp: 1 }).exec();
            socket.emit('chatHistory', messages)
        } catch(err) {
            console.log(err)
        }
    })

    socket.on('privateMessage', async (msg) => {
        try {
            const newMessage = new Chat(msg)
            const savedMessage = await newMessage.save()
            
            const roomId = [msg.sender, msg.receiver].sort().join('-')
            socket.join(roomId)
            
            const receiverUser = await User.findOne({ username: msg.receiver })
            
            const messageData = {
                sender: savedMessage.sender,
                receiver: savedMessage.receiver,
                message: savedMessage.message,
                senderAvatar: savedMessage.senderAvatar,
                timestamp: savedMessage.timestamp
            }
            
            if (receiverUser && receiverUser.socketId) {
                io.to(receiverUser.socketId).emit('receiveMessage', messageData)
            }
            
            socket.emit('receiveMessage', messageData)
        } catch(err) {
            console.log(err)
        }
    })

    socket.on('getChatUsers', async (currentUser) => {
        try {
            const chatUsers = await Chat.aggregate([
                {
                    $match: {
                        $or: [
                            { sender: currentUser },
                            { receiver: currentUser }
                        ]
                    }
                },
                {
                    $group: {
                        _id: {
                            $cond: [
                                { $eq: ['$sender', currentUser] },
                                '$receiver',
                                '$sender'
                            ]
                        },
                        lastMessage: { $last: '$message' },
                        lastMessageTime: { $last: '$timestamp' }
                    }
                },
                { $sort: { lastMessageTime: -1 } }
            ])
            
            const usernames = chatUsers.map(chat => chat._id)
            const users = await User.find({ username: { $in: usernames } }).select('username avatar online')
            
            const usersWithLastMessage = users.map(user => {
                const chatInfo = chatUsers.find(chat => chat._id === user.username)
                return {
                    username: user.username,
                    avatar: user.avatar,
                    online: user.online,
                    lastMessage: chatInfo.lastMessage,
                    lastMessageTime: chatInfo.lastMessageTime
                }
            })
            
            socket.emit('chatUsersList', usersWithLastMessage)
        } catch(err) {
            console.log(err)
        }
    })

    socket.on("disconnect", async () => {
        console.log("disconnect")
        try {
            const user = await User.findOne({ socketId: socket.id })
            if (user) {
                user.online = false
                user.lastSeen = new Date()
                await user.save()
                socket.broadcast.emit('userOffline', { username: user.username, online: false })
            }
        } catch(err) {
            console.log(err)
        }
    })
})
app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello World" });
});
server.listen("3002", "0.0.0.0", () => {
    console.log("Backend server running on 0.0.0.0:3002")
})