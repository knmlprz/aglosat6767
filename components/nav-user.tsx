"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar"

// Prototyp nie ma kont: pokazujemy tylko, w czyim imieniu działa demo.
export function NavUser({ name, opis }: { name: string; opis: string }) {
  const initials = name
    .split(" ")
    .filter((w) => /^\p{L}/u.test(w))
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
  return (
    <SidebarMenu>
      <SidebarMenuItem className="flex items-center gap-2 p-2">
        <Avatar className="size-8 rounded-lg grayscale">
          <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
        </Avatar>
        <div className="grid flex-1 text-left text-sm leading-tight">
          <span className="truncate font-medium">{name}</span>
          <span className="truncate text-xs text-foreground/70">{opis}</span>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
