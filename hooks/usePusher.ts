"use client"

import { useEffect, useState, useRef } from 'react'
import Pusher from 'pusher-js'
import { useAuth } from '@clerk/nextjs'

interface Message {
  id: string
  content: string
  senderId: string
  receiverId?: string
  timestamp: Date
  type: 'text' | 'image'
  status: 'sent' | 'delivered' | 'read'
}

interface UsePusherProps {
  currentUserId: string
  otherUserId?: string
}

export function usePusher({ currentUserId, otherUserId }: UsePusherProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const pusherRef = useRef<Pusher | null>(null)
  const channelRef = useRef<any>(null)
  const { getToken } = useAuth()

  useEffect(() => {
    if (!currentUserId || !otherUserId) return

    // Load message history from database
    const loadMessageHistory = async () => {
      try {
        const token = await getToken()
        const response = await fetch(`/api/messages/get?userId=${otherUserId}`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : ''
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          const transformedMessages = data.messages.map((msg: any) => ({
            id: msg.id,
            content: msg.content,
            senderId: msg.senderId,
            receiverId: msg.receiverId,
            timestamp: new Date(msg.timestamp),
            type: msg.type,
            status: msg.status
          }))
          setMessages(transformedMessages)
          console.log('✅ Loaded message history:', transformedMessages.length, 'messages')
        } else {
          console.warn('Failed to load message history:', response.status)
          setMessages([]) // Start with empty messages if loading fails
        }
      } catch (error) {
        console.error('Error loading message history:', error)
        setMessages([]) // Start with empty messages if loading fails
      }
    }

    loadMessageHistory()

    // Initialize Pusher
    if (!pusherRef.current) {
      pusherRef.current = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        authEndpoint: '/api/pusher/auth',
        auth: {
          headers: {
            authorization: `Bearer ${getToken()}`
          }
        }
      })

      pusherRef.current.connection.bind('connected', () => {
        setIsConnected(true)
      })

      pusherRef.current.connection.bind('disconnected', () => {
        setIsConnected(false)
      })
    }

    // Generate channel name (same logic as backend)
    const channelName = `chat-${[currentUserId, otherUserId].sort().join('-')}`

    // Subscribe to channel
    if (pusherRef.current && !channelRef.current) {
      channelRef.current = pusherRef.current.subscribe(channelName)

      // Listen for new messages
      channelRef.current.bind('new-message', (data: any) => {
        const newMessage: Message = {
          id: data.id,
          content: data.content,
          senderId: data.senderId,
          receiverId: data.receiverId,
          timestamp: new Date(data.timestamp),
          type: data.type || 'text',
          status: data.status || 'sent'
        }

        setMessages(prev => {
          // Avoid duplicates
          const exists = prev.find(msg => msg.id === newMessage.id)
          if (exists) return prev
          
          return [...prev, newMessage]
        })

        // Auto-mark as read if current user is the receiver
        if (data.receiverId === currentUserId) {
          setTimeout(() => {
            markMessagesAsRead([data.id], data.senderId)
          }, 1000)
        }
      })

      // Listen for message status updates
      channelRef.current.bind('message-status', (data: any) => {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === data.messageId 
              ? { ...msg, status: data.status }
              : msg
          )
        )
      })

      // Listen for read receipts
      channelRef.current.bind('messages-read', (data: any) => {
        setMessages(prev => 
          prev.map(msg => 
            data.messageIds.includes(msg.id)
              ? { ...msg, status: 'read' }
              : msg
          )
        )
      })
    }

    return () => {
      if (channelRef.current) {
        channelRef.current.unbind_all()
        pusherRef.current?.unsubscribe(channelName)
        channelRef.current = null
      }
    }
  }, [currentUserId, otherUserId])

  // Load initial messages
  useEffect(() => {
    if (!currentUserId || !otherUserId) return

    loadMessages()
  }, [currentUserId, otherUserId])

  const loadMessages = async () => {
    try {
      const response = await fetch(`/api/messages/get?userId=${otherUserId}`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })))
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const sendMessage = async (content: string, type: 'text' | 'image' = 'text') => {
    if (!currentUserId || !otherUserId || !content.trim()) return

    try {
      const token = await getToken()
      
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          content: content.trim(),
          receiverId: otherUserId,
          type
        })
      })

      console.log('Send message response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Send message failed:', response.status, errorText)
        throw new Error(`Failed to send message: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      console.log('Send message success:', data)
      return data.message
    } catch (error) {
      console.error('Error sending message:', error)
      throw error
    }
  }

  const markMessagesAsRead = async (messageIds: string[], senderId: string) => {
    try {
      await fetch('/api/messages/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messageIds,
          senderId
        })
      })
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        channelRef.current.unbind_all()
        pusherRef.current?.unsubscribe(channelRef.current.name)
      }
      if (pusherRef.current) {
        pusherRef.current.disconnect()
      }
    }
  }, [])

  return {
    messages,
    sendMessage,
    isConnected,
    loadMessages
  }
}