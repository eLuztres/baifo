"use client";

import { Loader2, RotateCcw, X } from "lucide-react";
import ProductMedia from "@/components/ProductMedia";
import { useI18n, useTranslateMessage } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { TranslationKey } from "@/lib/i18n-core";
import { cn } from "@/lib/utils";
import type { Picture } from "./use-product-studio";

interface GeneratedViewCardProps {
  label: TranslationKey;
  picture: Picture;
  onRedo: () => void;
  onToggleRemoved: () => void;
}

/** One AI view of the ring: generating, done (redo or leave out) or failed. */
const GeneratedViewCard = ({ label, picture, onRedo, onToggleRemoved }: GeneratedViewCardProps) => {
  const { t } = useI18n();
  const translateMessage = useTranslateMessage();

  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-3 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">{t(label)}</p>
          {!picture.isLoading && (
            <div className="flex gap-1">
              <Button type="button" size="sm" variant="ghost" onClick={onRedo}>
                <RotateCcw /> {t("STUDIO_REDO")}
              </Button>
              {picture.url && (
                <Button type="button" size="sm" variant="ghost" onClick={onToggleRemoved}>
                  {picture.isRemoved ? (
                    t("STUDIO_RESTORE")
                  ) : (
                    <>
                      <X /> {t("STUDIO_REMOVE")}
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
        <div
          className={cn(
            "relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg bg-muted",
            picture.isLoading && "animate-pulse",
            picture.isRemoved && "opacity-30",
          )}
        >
          {picture.url && !picture.isLoading ? (
            <ProductMedia src={picture.url} alt={t(label)} fill />
          ) : picture.isLoading ? (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> {t("STUDIO_GENERATING")}
            </span>
          ) : picture.error ? (
            <span className="px-4 text-center text-sm text-destructive">
              {t("STUDIO_FAILED")}: {translateMessage(picture.error)}
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};

export default GeneratedViewCard;
