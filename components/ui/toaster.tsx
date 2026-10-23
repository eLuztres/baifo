"use client"

import type { ReactNode } from "react"
import { useToast } from "@/hooks/use-toast"
import { useI18n } from "@/components/i18n-provider"
import { translateMessage } from "@/lib/i18n-core"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()
  const { t } = useI18n()
  // Actions return translation keys (e.g. from formatError), so string toasts are translated here once.
  const translate = (node: ReactNode) =>
    typeof node === "string" ? translateMessage(t, node) : node

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{translate(title)}</ToastTitle>}
              {description && (
                <ToastDescription>{translate(description)}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose aria-label={t("CLOSE")} />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
