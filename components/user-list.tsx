"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useAuth } from '@clerk/nextjs'
import dynamic from 'next/dynamic'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { MessageSquare, Circle } from "lucide-react"

interface User {
  id: string
  name: string
  email: string
  imageUrl: string
  hasImage?: boolean
  isOnline?: boolean
}

interface UserListProps {
  onUserSelect?: (user: { id: string; name: string; email: string; imageUrl: string; hasImage?: boolean; isOnline?: boolean }) => void
}

function UserListContent({ onUserSelect }: UserListProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const { isLoaded, isSignedIn, getToken } = useAuth()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && isLoaded && isSignedIn) {
      fetchUsers()
      
      // Set up interval to refresh user list periodically to show updated profile pictures
      const interval = setInterval(fetchUsers, 30000) // Refresh every 30 seconds
      
      return () => clearInterval(interval)
    }
  }, [mounted, isLoaded, isSignedIn])

  const fetchUsers = async () => {
    try {
      if (!isSignedIn) {
        setLoading(false)
        return
      }

      const token = await getToken()
      if (!token) {
        setLoading(false)
        return
      }

      const response = await fetch('/api/users', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Authorization': `Bearer ${token}`,
        }
      })
      
      if (response.ok) {
        const userData = await response.json()
        setUsers([])
        setTimeout(() => setUsers(userData), 100)
      }
    } catch (error) {
      // Silent error handling
    } finally {
      setLoading(false)
    }
  }

  // Show consistent initial state during hydration
  if (!mounted || !isLoaded) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <MessageSquare className="mx-auto h-12 w-12 mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <MessageSquare className="mx-auto h-12 w-12 mb-4" />
          <p>Please sign in to see users</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-sm text-muted-foreground">Loading users...</div>
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <MessageSquare className="mx-auto h-12 w-12 mb-4" />
          <p>No active chats</p>
          <p className="text-sm">Start a conversation to see users here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="px-3 py-2">
        <h3 className="text-sm font-medium text-muted-foreground">Users ({users.length})</h3>
      </div>
      <div className="space-y-1">
        {users.map((user) => (
          <Button
            key={user.id}
            variant="ghost"
            className="w-full justify-start h-12 px-3"
            onClick={() => {
              if (onUserSelect) {
                onUserSelect(user)
              }
            }}
          >
            <div className="flex items-center gap-3 w-full">
              <div className="relative">
                <div className="h-8 w-8 rounded-full overflow-hidden flex items-center justify-center">
                  {user.imageUrl ? (
                    <img
                      src={user.imageUrl}
                      alt={user.name}
                      className="w-full h-full object-cover rounded-full"
                      onLoad={(e) => {
                        // Hide the fallback when image loads
                        const target = e.target as HTMLImageElement
                        const fallback = target.nextElementSibling as HTMLElement
                        if (fallback) fallback.style.display = 'none'
                      }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                  ) : null}
                  {/* Fallback initials - only show if no image URL or image fails */}
                  <div 
                    className={`absolute inset-0 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-medium ${user.imageUrl ? 'block' : 'block'}`}
                  >
                    {user.name && user.name !== 'Unknown User' 
                      ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                      : '?'
                    }
                  </div>
                </div>
                {user.isOnline && (
                  <Circle className="absolute -bottom-0.5 -right-0.5 h-3 w-3 fill-green-500 text-green-500" />
                )}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium truncate">
                  {user.name || 'Unknown User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  Active now
                </p>
              </div>
            </div>
          </Button>
        ))}
      </div>
    </div>
  )
}

// Use dynamic import to prevent SSR hydration issues
export const UserList = dynamic(() => Promise.resolve(({ onUserSelect }: UserListProps) => <UserListContent onUserSelect={onUserSelect} />), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center text-muted-foreground">
      <div className="text-center">
        <MessageSquare className="mx-auto h-12 w-12 mb-4" />
        <p>Loading...</p>
      </div>
    </div>
  )
})