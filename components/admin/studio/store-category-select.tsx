"use client";

import { useI18n } from "@/components/i18n-provider";
import { Label } from "@/components/ui/label";
import type { StudioStoreCategory } from "./use-product-studio";

interface StoreCategorySelectProps {
  categories: StudioStoreCategory[];
  value: string;
  onChange: (categoryId: string) => void;
}

/** The store category of the new ring; the AI places the ring in that category's scene. */
const StoreCategorySelect = ({ categories, value, onChange }: StoreCategorySelectProps) => {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-md space-y-2">
      <Label htmlFor="studio-store-category">{t("STUDIO_STORE_CATEGORY")}</Label>
      <select
        id="studio-store-category"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
      >
        <option value="">{t("STUDIO_NO_STORE_CATEGORY")}</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <p className="text-xs text-muted-foreground">{t("STUDIO_STORE_CATEGORY_HINT")}</p>
    </div>
  );
};

export default StoreCategorySelect;
