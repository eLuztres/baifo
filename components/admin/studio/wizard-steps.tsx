"use client";

import { Check } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import type { TranslationKey } from "@/lib/i18n-core";
import { cn } from "@/lib/utils";

const WIZARD_STEPS: TranslationKey[] = [
  "STUDIO_STEP_PHOTO",
  "STUDIO_WIZARD_PICTURES",
  "STUDIO_WIZARD_DETAILS",
];

interface WizardStepsProps {
  /** Index of the current step in WIZARD_STEPS. */
  current: number;
}

const WizardSteps = ({ current }: WizardStepsProps) => {
  const { t } = useI18n();
  return (
    <ol className="flex items-center gap-2 text-sm sm:gap-4">
      {WIZARD_STEPS.map((label, index) => (
        <li key={label} className="flex items-center gap-2 sm:gap-4">
          {index > 0 && <span className="h-px w-6 bg-border sm:w-12" />}
          <span
            aria-current={index === current ? "step" : undefined}
            className={cn(
              "flex items-center gap-2",
              index > current && "text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-full border text-xs",
                index < current &&
                  "border-primary bg-primary text-primary-foreground",
                index === current && "border-primary text-primary",
              )}
            >
              {index < current ? <Check className="size-3.5" /> : index + 1}
            </span>
            <span className={cn(index !== current && "hidden sm:inline")}>
              {t(label)}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
};

export default WizardSteps;
