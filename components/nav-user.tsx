"use client"

import {
  ChevronsUpDown,
  LogOut,
  Camera,
  Loader2,
} from "lucide-react"
import { SignOutButton, useUser } from '@clerk/nextjs'
import { useState } from 'react'

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function NavUser() {
  const { isMobile } = useSidebar()
  const [isUploading, setIsUploading] = useState(false)
  const { user, isLoaded } = useUser()

  if (!isLoaded || !user) {
    return null
  }

  const userData = {
    name: user?.firstName && user?.lastName 
      ? `${user.firstName} ${user.lastName}` 
      : user?.firstName || "User",
    email: user?.emailAddresses[0]?.emailAddress || "user@example.com",
    // Try publicMetadata first, then imageUrl, then fallback
    avatar: user?.publicMetadata?.profileImageUrl || user?.imageUrl || "/avatars/user.jpg",
  }

  // Debug logging
  console.log('NavUser - Clerk user object:', user)
  console.log('NavUser - imageUrl:', user?.imageUrl)

  const handleProfilePicUpload = () => {
    if (isUploading) return
    
    // Create a hidden file input and trigger it
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
          alert('File too large. Please select an image smaller than 5MB.')
          return
        }

        try {
          setIsUploading(true)
          
          const formData = new FormData()
          formData.append('file', file)
          
          const response = await fetch('/api/upload-avatar', {
            method: 'POST',
            body: formData,
          })
          
          if (response.ok) {
            const result = await response.json()
            console.log('Upload successful - Full response:', result)
            console.log('Upload successful - imageUrl:', result.imageUrl)
            console.log('Upload successful - clerkImageUrl:', result.clerkImageUrl)
            
            // Wait a moment for Clerk to update, then force reload to get fresh data
            setTimeout(() => {
              console.log('Reloading page to refresh user data...')
              window.location.reload()
            }, 2000) // Increased to 2 seconds
          } else {
            const errorText = await response.text()
            console.error('Upload failed:', errorText)
            alert('Failed to upload profile picture. Please try again.')
          }
        } catch (error) {
          console.error('Upload error:', error)
          alert('Failed to upload profile picture. Please try again.')
        } finally {
          setIsUploading(false)
        }
      }
    }
    input.click()
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage 
                  src={`${userData.avatar}?t=${Date.now()}`} 
                  alt={userData.name}
                  className="object-cover"
                  onLoad={() => console.log('Avatar image loaded:', userData.avatar)}
                  onError={() => console.log('Avatar image failed to load:', userData.avatar)}
                />
                <AvatarFallback className="rounded-lg">
                  {userData.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{userData.name}</span>
                <span className="truncate text-xs">{userData.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage 
                    src={`${userData.avatar}?t=${Date.now()}`} 
                    alt={userData.name}
                    className="object-cover"
                  />
                  <AvatarFallback className="rounded-lg">
                    {userData.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{userData.name}</span>
                  <span className="truncate text-xs">{userData.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleProfilePicUpload} disabled={isUploading}>
              {isUploading ? <Loader2 className="animate-spin" /> : <Camera />}
              {isUploading ? 'Uploading...' : 'Change Profile Picture'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <SignOutButton>
              <DropdownMenuItem>
                <LogOut />
                Log out
              </DropdownMenuItem>
            </SignOutButton>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
