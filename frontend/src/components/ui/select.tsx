"use client"

import * as React from "react"
import { Select as SelectPrimitive } from "@base-ui/react/select"
import { ChevronDown, Check } from "lucide-react"

import { cn } from "@/lib/utils"

const Select = SelectPrimitive.Root

interface SelectTriggerProps extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> {
  placeholder?: string;
}

function SelectTrigger({
  className,
  placeholder,
  children,
  ...props
}: SelectTriggerProps) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        "input-glass flex items-center justify-between text-left group/trigger",
        className
      )}
      {...props}
    >
      <div className="truncate">
        {children ? children : <SelectPrimitive.Value placeholder={placeholder} />}
      </div>
      <SelectPrimitive.Icon className="shrink-0 ml-2">
        <ChevronDown className="size-4 opacity-50 transition-transform duration-200 group-data-[state=open]/trigger:rotate-180" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectPortal(props: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Portal>) {
  return <SelectPrimitive.Portal {...props} />
}

interface SelectContentProps extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Positioner> {
  popupClassName?: string;
}

function SelectContent({ className, children, ...props }: SelectContentProps) {
  return (
    <SelectPrimitive.Positioner
      side="bottom"
      sideOffset={4}
      align="start"
      alignItemWithTrigger={false}
      className={cn("z-50 w-[var(--anchor-width)] min-w-40", className)}
      {...props}
    >
      <SelectPrimitive.Popup
        className={cn(
          "glass-panel w-full overflow-hidden border-[#f38020]/20 bg-black/95 p-1 px-1 shadow-2xl animate-in fade-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95",
        )}
      >
        <div className="py-1 max-h-[400px] overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </SelectPrimitive.Popup>
    </SelectPrimitive.Positioner>
  )
}

function SelectItem({ className, children, ...props }: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-md py-2 pl-8 pr-2 text-sm text-slate-300 outline-none transition-colors data-[highlighted]:bg-[#f38020]/10 data-[highlighted]:text-white data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="size-4 text-[#f38020]" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

export {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectPortal,
}
