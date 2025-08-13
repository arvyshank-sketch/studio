"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="grid gap-2 flex-1">
                <div className="flex items-center gap-3">
                    {variant === 'destructive' ? 
                        <AlertCircle className="text-red-400" /> : 
                        <AlertCircle className="text-cyan-300" />}
                    {title && <ToastTitle>{title}</ToastTitle>}
                </div>
              {description && (
                <div className="pl-8">
                    <ToastDescription>{description}</ToastDescription>
                </div>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
