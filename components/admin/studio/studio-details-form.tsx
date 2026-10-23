"use client";

import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import InfoPhotoUpload from "./info-photo-upload";
import type { StudioDetails } from "./use-product-studio";

interface StudioDetailsFormProps {
  categories: string[];
  details: StudioDetails;
  onChange: (change: Partial<StudioDetails>) => void;
  infoUrl?: string;
  onInfoUpload: (url: string) => void;
  onInfoRemove: () => void;
  isWriting: boolean;
  onWriteText: () => void;
  isSaving: boolean;
  /** False while pictures or text are still being made. */
  canSave: boolean;
  onBack: () => void;
  onSave: () => void;
}

/** Last wizard step: notes and info photo for the AI text, then name, price, stock, category and description. */
const StudioDetailsForm = ({
  categories,
  details,
  onChange,
  infoUrl,
  onInfoUpload,
  onInfoRemove,
  isWriting,
  onWriteText,
  isSaving,
  canSave,
  onBack,
  onSave,
}: StudioDetailsFormProps) => {
  const { t } = useI18n();

  return (
    <Card>
      <CardContent className="grid gap-5 p-5 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="studio-notes">{t("STUDIO_NOTES")}</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="studio-notes"
              value={details.notes}
              placeholder={t("STUDIO_NOTES_PLACEHOLDER")}
              onChange={(event) => onChange({ notes: event.target.value })}
            />
            <Button
              type="button"
              variant="outline"
              disabled={isWriting}
              onClick={onWriteText}
            >
              {isWriting ? <Loader2 className="animate-spin" /> : <Sparkles />}
              {isWriting ? t("STUDIO_WRITING") : t("STUDIO_WRITE_TEXT")}
            </Button>
          </div>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>{t("STUDIO_INFO_PHOTO")}</Label>
          <p className="text-xs text-muted-foreground">{t("STUDIO_INFO_HINT")}</p>
          <InfoPhotoUpload url={infoUrl} onUpload={onInfoUpload} onRemove={onInfoRemove} />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="studio-name">{t("STUDIO_NAME")}</Label>
          <Input
            id="studio-name"
            value={details.name}
            onChange={(event) => onChange({ name: event.target.value })}
          />
        </div>

        <div className="grid grid-cols-3 gap-3 md:col-span-2">
          <div className="space-y-2">
            <Label htmlFor="studio-price">{t("STUDIO_PRICE")}</Label>
            <Input
              id="studio-price"
              inputMode="decimal"
              value={details.price}
              placeholder="0,00"
              onChange={(event) => onChange({ price: event.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="studio-stock">{t("STUDIO_STOCK")}</Label>
            <Input
              id="studio-stock"
              type="number"
              min={0}
              value={details.stock}
              onChange={(event) => onChange({ stock: event.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="studio-category">{t("STUDIO_CATEGORY")}</Label>
            <Input
              id="studio-category"
              list="studio-categories"
              value={details.category}
              onChange={(event) => onChange({ category: event.target.value })}
            />
            <datalist id="studio-categories">
              {categories.map((entry) => (
                <option key={entry} value={entry} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="studio-description">{t("STUDIO_DESCRIPTION")}</Label>
          <Textarea
            id="studio-description"
            rows={4}
            value={details.description}
            onChange={(event) => onChange({ description: event.target.value })}
          />
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between md:col-span-2">
          <Button type="button" variant="ghost" onClick={onBack} disabled={isSaving}>
            <ArrowLeft /> {t("STUDIO_BACK")}
          </Button>
          <Button type="button" size="lg" onClick={onSave} disabled={!canSave || isSaving}>
            {isSaving && <Loader2 className="animate-spin" />}
            {isSaving ? t("STUDIO_SAVING") : t("STUDIO_SAVE")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default StudioDetailsForm;
