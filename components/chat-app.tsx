"use client"

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { AppSidebar } from "@/components/app-sidebar"
import { ChatInterface } from "@/components/chat-interface" 
import { ThemeToggle } from "@/components/theme-toggle"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

interface SelectedUser {
  id: string
  name: string
  email: string
  imageUrl: string
  isOnline?: boolean
}

export function ChatApp() {
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null)
  const { user } = useUser()

  return (
    <SidebarProvider>
      <AppSidebar 
        onUserSelect={setSelectedUser}
        className={selectedUser ? 'hidden' : ''}
      />
      <SidebarInset className={selectedUser ? 'ml-0' : ''}>
        <header className={`flex h-16 shrink-0 items-center gap-2 ${selectedUser ? 'hidden' : ''}`}>
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Welcome back, {user?.firstName || user?.emailAddresses[0]?.emailAddress}
              </span>
            </div>
          </div>
          <div className="ml-auto px-4">
            <ThemeToggle />
          </div>
        </header>
        
        <div className="flex-1 flex">
          <ChatInterface
            selectedUser={selectedUser}
            onClose={() => setSelectedUser(null)}
            currentUserId={user?.id || ''}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}