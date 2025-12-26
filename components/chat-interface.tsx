"use client"

import { useState, useRef, useEffect } from 'react'
import { Send, Phone, Video, MoreVertical, ArrowLeft, Check, CheckCheck } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { usePusher } from '@/hooks/usePusher'

interface Message {
  id: string
  content: string
  senderId: string
  timestamp: Date
  type: 'text' | 'image'
  status: 'sent' | 'delivered' | 'read'
}

interface ChatInterfaceProps {
  selectedUser: {
    id: string
    name: string
    email: string
    imageUrl: string
    isOnline?: boolean
  } | null
  onClose: () => void
  currentUserId: string
}

export function ChatInterface({ selectedUser, onClose, currentUserId }: ChatInterfaceProps) {
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Use Pusher hook for real-time messaging
  const { messages, sendMessage, isConnected } = usePusher({
    currentUserId,
    otherUserId: selectedUser?.id
  })

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const formatDateSeparator = (date: Date) => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric' 
      })
    }
  }

  const shouldShowDateSeparator = (currentMessage: Message, previousMessage?: Message) => {
    if (!previousMessage) return true
    
    const currentDate = new Date(currentMessage.timestamp).toDateString()
    const previousDate = new Date(previousMessage.timestamp).toDateString()
    
    return currentDate !== previousDate
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUser || isLoading) return

    setIsLoading(true)
    try {
      await sendMessage(newMessage.trim())
      setNewMessage('')
    } catch (error) {
      console.error('Failed to send message:', error)
      // Could show error toast here
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (!selectedUser) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/10">
        <div className="text-center">
          <div className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <Send className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">Welcome to Spill</h3>
          <p className="text-muted-foreground">Select a user to start chatting</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full rounded-xl overflow-hidden border border-border/50 bg-card/50 backdrop-blur">
      {/* Chat Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden"
          onClick={onClose}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        
        <Avatar className="h-10 w-10">
          <AvatarImage 
            src={selectedUser.imageUrl} 
            alt={selectedUser.name}
            onLoad={() => console.log('Chat header avatar loaded for:', selectedUser.name)}
            onError={() => console.log('Chat header avatar failed for:', selectedUser.name)}
          />
          <AvatarFallback>
            {selectedUser.name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <h3 className="font-medium">{selectedUser.name}</h3>
          <p className="text-sm text-muted-foreground">
            {isConnected ? (selectedUser.isOnline ? 'Online' : 'Last seen recently') : 'Connecting...'}
          </p>
        </div>
        
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="hidden sm:flex">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden sm:flex">
            <Video className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>View Profile</DropdownMenuItem>
              <DropdownMenuItem>Clear Chat</DropdownMenuItem>
              <DropdownMenuItem>Block User</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-linear-to-b from-muted/5 via-background/50 to-muted/10">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-4">
              <Send className="w-6 h-6 text-muted-foreground/60" />
            </div>
            <p className="text-lg font-medium mb-1">Start a conversation</p>
            <p className="text-sm">Say hello to {selectedUser.name}!</p>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((message, index) => (
              <div key={message.id} className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                {shouldShowDateSeparator(message, messages[index - 1]) && (
                  <div className="flex justify-center my-6">
                    <div className="bg-muted/60 text-muted-foreground text-xs px-4 py-2 rounded-full border border-border/30 shadow-sm">
                      {formatDateSeparator(message.timestamp)}
                    </div>
                  </div>
                )}
                <div
                  className={`flex ${message.senderId === currentUserId ? 'justify-end' : 'justify-start'} mb-1.5 group`}
                >
                  {/* Receiver avatar for received messages */}
                  {message.senderId !== currentUserId && (
                    <Avatar className="h-6 w-6 mr-2 mt-1 shrink-0 ring-1 ring-background shadow-sm">
                      <AvatarImage 
                        src={selectedUser.imageUrl} 
                        alt={selectedUser.name}
                      />
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {selectedUser.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div
                    className={`max-w-70 lg:max-w-sm px-3 py-2 rounded-xl shadow-sm transition-all duration-200 hover:shadow-md group-hover:scale-[1.01] ${
                      message.senderId === currentUserId
                        ? 'bg-primary text-primary-foreground rounded-br-md ml-auto'
                        : 'bg-card border border-border/50 rounded-bl-md hover:bg-muted/30 hover:border-border/70'
                    }`}
                  >
                    <p className={`text-[13px] leading-[1.4] wrap-break-word ${
                      message.senderId === currentUserId 
                        ? 'text-primary-foreground' 
                        : 'text-foreground'
                    }`}>
                      {message.content}
                    </p>
                    
                    {/* Sender message timestamp and status */}
                    {message.senderId === currentUserId && (
                      <div className="flex items-center justify-end gap-1 mt-1 text-primary-foreground/70">
                        <span className="text-[10px] font-medium">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div className="ml-0.5 flex items-center">
                          {message.status === 'sent' && (
                            <Check className="h-2.5 w-2.5 text-primary-foreground/60" />
                          )}
                          {(message.status === 'delivered' || message.status === 'read') && (
                            <CheckCheck className="h-2.5 w-2.5 text-primary-foreground/60" />
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sender avatar spacing */}
                  {message.senderId === currentUserId && (
                    <div className="w-6 ml-2"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Typing Indicator Placeholder */}
        {false && selectedUser && ( // Enable when implementing typing indicators
          <div className="flex justify-start mb-2 animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
            <Avatar className="h-8 w-8 mr-3 mt-1 shrink-0 ring-2 ring-background shadow-sm">
              <AvatarImage src={selectedUser!.imageUrl} alt={selectedUser!.name} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {selectedUser!.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="bg-card border border-border/50 rounded-2xl rounded-bl-md px-4 py-3 max-w-xs shadow-sm">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Message ${selectedUser.name}...`}
              className="pr-4 rounded-full"
            />
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isLoading}
            size="icon"
            className="rounded-full"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}