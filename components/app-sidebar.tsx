"use client"

import * as React from "react"
import {
  MessageSquare,
} from "lucide-react"

import { NavUser } from "@/components/nav-user"
import { UserList } from "@/components/user-list"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function AppSidebar({ onUserSelect, ...props }: React.ComponentProps<typeof Sidebar> & {
  onUserSelect?: (user: { id: string; name: string; email: string; imageUrl: string; isOnline?: boolean }) => void
}) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <MessageSquare className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Spill</span>
                  <span className="truncate text-xs">Chat App</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <UserList onUserSelect={onUserSelect} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
