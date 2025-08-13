
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
        const isSystemMessage = typeof title === 'string' && title.startsWith('[') && title.endsWith(']');
        return (
          <Toast key={id} variant={variant} {...props}>
            <div className={cn("grid gap-1 flex-1", isSystemMessage && "text-center")}>
                {isSystemMessage ? (
                     <ToastTitle className="text-xl tracking-widest">{title}</ToastTitle>
                ) : (
                    <>
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
                    </>
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
