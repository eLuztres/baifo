"use client";

import { AlertCircle, Check, Circle, Loader2 } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import type { TranslationKey } from "@/lib/i18n-core";
import { cn } from "@/lib/utils";
import type { ProgressStep, StepStatus } from "./use-product-studio";

const STATUS_LABELS: Record<StepStatus, TranslationKey> = {
  waiting: "STUDIO_STATUS_WAITING",
  working: "STUDIO_STATUS_WORKING",
  done: "STUDIO_STATUS_DONE",
  failed: "STUDIO_STATUS_FAILED",
};

const StatusIcon = ({ status }: { status: StepStatus }) => {
  if (status === "working")
    return <Loader2 className="size-4 animate-spin text-primary" />;
  if (status === "done") return <Check className="size-4 text-primary" />;
  if (status === "failed")
    return <AlertCircle className="size-4 text-destructive" />;
  return <Circle className="size-4 text-muted-foreground" />;
};

interface StudioProgressProps {
  steps: ProgressStep[];
}

// Always shows what is done and what is still running, so an upload never looks like nothing happened.
const StudioProgress = ({ steps }: StudioProgressProps) => {
  const { t } = useI18n();
  return (
    <ol
      aria-label={t("STUDIO_PROGRESS")}
      className="grid gap-2 rounded-xl border border-border bg-card p-4 sm:grid-cols-5"
    >
      {steps.map((step) => (
        <li key={step.label} className="flex items-center gap-2 text-sm">
          <StatusIcon status={step.status} />
          <span
            className={cn(step.status === "waiting" && "text-muted-foreground")}
          >
            {t(step.label)}
          </span>
          <span
            className={cn(
              "ml-auto text-xs sm:ml-0",
              step.status === "failed"
                ? "text-destructive"
                : "text-muted-foreground",
            )}
          >
            {t(STATUS_LABELS[step.status])}
          </span>
        </li>
      ))}
    </ol>
  );
};

export default StudioProgress;
