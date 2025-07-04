'use client'

import React, { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'

const WebSocketTest = () => {
  const [messages, setMessages] = useState<any[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [username, setUsername] = useState('')
  const [isJoined, setIsJoined] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [showUserList, setShowUserList] = useState(false)
  const socketRef = useRef<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 메시지 자동 스크롤
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 메시지 추가
  const addMessage = (text: string, type = 'user', sender = username) => {
    const newMessage = {
      id: Date.now(),
      text,
      type,
      sender,
      timestamp: new Date().toLocaleTimeString()
    }
    setMessages(prev => [...prev, newMessage])
  }

  // Socket 서버 연결
  const connectWebSocket = async () => {
    try {
      // Socket 서버 초기화
      await fetch('/api/socket')
      
      // Socket 클라이언트 연결 (같은 포트, 다른 경로)
      socketRef.current = io({
        path: '/api/socket'
      })
      
      socketRef.current.on('connect', () => {
        console.log('Socket 연결됨!')
        setIsConnected(true)
      })

      socketRef.current.on('disconnect', () => {
        console.log('Socket 연결 끊김!')
        setIsConnected(false)
      })

      socketRef.current.on('message', (data: any) => {
        if (data.type === 'system') {
          addMessage(data.text, 'system')
        } else {
          addMessage(data.text, 'other', data.username)
        }
      })

      // 접속자 목록 업데이트
      socketRef.current.on('userList', (users: string[]) => {
        setOnlineUsers(users)
      })

    } catch (error) {
      console.error('Socket 연결 실패:', error)
    }
  }

  // 채팅방 입장
  const joinChat = async () => {
    if (username.trim()) {
      await connectWebSocket()
      if (socketRef.current) {
        socketRef.current.emit('join', { username })
        setIsJoined(true)
      }
    }
  }

  // 메시지 전송
  const sendMessage = () => {
    if (inputMessage.trim() && isConnected && socketRef.current) {
      const messageData = {
        text: inputMessage,
        username,
        timestamp: new Date().toISOString()
      }

      socketRef.current.emit('message', messageData)
      addMessage(inputMessage, 'user')
      setInputMessage('')
    }
  }

  // 엔터키 처리
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (!isJoined) {
        joinChat()
      } else {
        sendMessage()
      }
    }
  }

  // 연결 해제
  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      setIsConnected(false)
      setIsJoined(false)
      setMessages([])
      addMessage('채팅방에서 나갔습니다.', 'system')
    }
  }

  if (!isJoined) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
          Next.js WebSocket 테스트
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              사용자명
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="사용자명을 입력하세요"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={joinChat}
            disabled={!username.trim()}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            채팅방 입장
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto mt-8 bg-white rounded-lg shadow-lg overflow-hidden relative">
      {/* 헤더 */}
      <div className="bg-green-500 text-white p-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Next.js WebSocket 테스트</h2>
          <p className="text-sm opacity-90">
            {isConnected ? '🟢 연결됨' : '🔴 연결 끊김'} | {username} | 접속자 {onlineUsers.length}명
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowUserList(!showUserList)}
            className="bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded text-sm"
          >
            👥 접속자
          </button>
          <button
            onClick={disconnect}
            className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-sm"
          >
            나가기
          </button>
        </div>
      </div>

      {/* 접속자 목록 모달 */}
      {showUserList && (
        <div className="absolute top-16 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-10 min-w-48">
          <h3 className="font-bold text-gray-800 mb-2">접속자 목록 ({onlineUsers.length}명)</h3>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {onlineUsers.map((user, index) => (
              <div 
                key={index} 
                className={`text-sm p-2 rounded ${
                  user === username 
                    ? 'bg-green-100 text-green-800 font-semibold' 
                    : 'bg-gray-50 text-gray-700'
                }`}
              >
                {user === username ? `${user} (나)` : user}
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowUserList(false)}
            className="mt-2 text-xs text-gray-500 hover:text-gray-700"
          >
            닫기
          </button>
        </div>
      )}

      {/* 메시지 영역 */}
      <div className="h-96 overflow-y-auto p-4 bg-gray-50">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`mb-3 ${
              message.type === 'user' 
                ? 'text-right' 
                : message.type === 'system' 
                ? 'text-center' 
                : 'text-left'
            }`}
          >
            {message.type === 'system' ? (
              <div className="text-gray-500 text-sm italic">
                {message.text}
              </div>
            ) : (
              <div className={`inline-block max-w-xs px-3 py-2 rounded-lg ${
                message.type === 'user'
                  ? 'bg-green-500 text-white'
                  : 'bg-white border border-gray-300'
              }`}>
                {message.type === 'other' && (
                  <div className="text-xs text-gray-500 mb-1">
                    {message.sender}
                  </div>
                )}
                <div>{message.text}</div>
                <div className={`text-xs mt-1 ${
                  message.type === 'user' ? 'text-green-100' : 'text-gray-400'
                }`}>
                  {message.timestamp}
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="p-4 border-t bg-white">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="메시지를 입력하세요..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            disabled={!isConnected}
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || !isConnected}
            className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            전송
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-2">
          💡 Next.js에 내장된 Socket 서버를 사용합니다.
        </div>
      </div>
    </div>
  )
}

export default WebSocketTest