import React, { useEffect, useRef } from 'react'

const ChatLists = ({chats, currentUser}) => {
    const endOfMessages = useRef()
    
    function SenderChat ({message, avatar, timestamp}) {
        return (
            <div className='message_wrapper sender'>
                <div className='chat_bubble sender_bubble'>
                    <p className='message_text'>{message}</p>
                    <span className='message_time'>
                        {new Date(timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                </div>
            </div>
        )
    }
    
    function ReceiverChat ({message, avatar, timestamp}) {
        return (
            <div className='message_wrapper receiver'>
                <div className='chat_bubble receiver_bubble'>
                    <p className='message_text'>{message}</p>
                    <span className='message_time'>
                        {new Date(timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                </div>
            </div>
        )
    }
    
    useEffect(() => {
        scrollToBottom()
    }, [chats])

    const scrollToBottom = () => {
        endOfMessages.current?.scrollIntoView({behavior: "smooth"})
    }
    
  return (
    <div className='chats_list'>
        {
            chats.map((chat, index) => {
                if(chat.sender === currentUser) {
                    return <SenderChat 
                    key={index}
                    message = {chat.message}
                    avatar = {chat.senderAvatar}
                    timestamp = {chat.timestamp}/>
                }
                 else {
                    return <ReceiverChat 
                    key={index}
                    message = {chat.message}
                    avatar = {chat.senderAvatar}
                    timestamp = {chat.timestamp}/>
                 }
            })
        }
        <div ref={endOfMessages}></div>
    </div>
  )
}

export default ChatLists