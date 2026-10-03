"use client"

import * as React from "react"
import Link from "next/link"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { ListChecksIcon, RouteIcon, SatelliteIcon, TagIcon } from "lucide-react"

const navMain = [
  { title: "Planista", url: "/app/planista", icon: <ListChecksIcon /> },
  { title: "Mieszkaniec", url: "/app/mieszkaniec", icon: <RouteIcon /> },
  { title: "Próbka dla modelu", url: "/app/etykiety", icon: <TagIcon /> },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<Link href="/" />}
            >
              <div className="flex bg-slate-900 text-white rounded-md items-center justify-center p-1">
                <SatelliteIcon className="size-4" />
              </div>
              <span className="text-base font-bold tracking-tight">AgloSat</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser name="Planista (demo)" opis="konto demonstracyjne, bez logowania" />
      </SidebarFooter>
    </Sidebar>
  )
}
