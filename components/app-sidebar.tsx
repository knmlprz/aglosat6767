"use client"

import * as React from "react"
import Link from "next/link"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
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
import {
  HomeIcon,
  MapIcon,
  DatabaseIcon,
  FileTextIcon,
  Settings2Icon,
  CircleHelpIcon,
  ListChecksIcon,
} from "lucide-react"

const data = {
  user: {
    name: "Planista (demo)",
    email: "konto demonstracyjne",
    avatar: "",
  },
  navMain: [
    { title: "Planista", url: "/app/planista", icon: <ListChecksIcon /> },
    { title: "Panel główny", url: "/app", icon: <HomeIcon /> },
    { title: "Mapa", url: "/app#mapa", icon: <MapIcon /> },
  ],
  navSecondary: [
    { title: "Ustawienia", url: "#", icon: <Settings2Icon /> },
    { title: "Pomoc", url: "#", icon: <CircleHelpIcon /> },
  ],
  documents: [
    { name: "Baza Danych (OSM)", url: "#", icon: <DatabaseIcon /> },
    { name: "Zapisane Raporty", url: "#", icon: <FileTextIcon /> },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<Link href="/app" />}
            >
              <div className="flex bg-blue-600 text-white rounded-md items-center justify-center p-1">
                <MapIcon className="size-4" />
              </div>
              <span className="text-base font-bold tracking-tight">AgloSat</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
