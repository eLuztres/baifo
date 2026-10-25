"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createSubcategory, updateSubcategory } from "@/lib/actions/category.actions";
import type { LocalizedText } from "@/lib/category";
import { LOCALES, type Locale } from "@/lib/i18n-core";

export interface EditableSubcategory {
  id: string;
  name: LocalizedText;
}

interface SubcategoryListProps {
  parentSlug: string;
  /** The shop's languages, its own first. */
  locales: Locale[];
  subcategories: EditableSubcategory[];
}

interface SubcategoryRowProps {
  locales: Locale[];
  initialName: LocalizedText;
  saveLabel: string;
  /** Resolves to whether it was saved. */
  onSave: (name: LocalizedText) => Promise<boolean>;
  /** A new subcategory starts empty again after it was added. */
  shouldClearOnSave?: boolean;
}

const languageName = (locale: Locale) => LOCALES.find(({ id }) => id === locale)?.name ?? locale;

/** One subcategory's name in every language, with its own save button. */
const SubcategoryRow = ({ locales, initialName, saveLabel, onSave, shouldClearOnSave }: SubcategoryRowProps) => {
  const [name, setName] = useState(initialName);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const isSaved = await onSave(name);
    setIsSaving(false);
    if (isSaved && shouldClearOnSave) setName({});
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-end">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {locales.map((locale) => (
            <div key={locale} className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{languageName(locale)}</Label>
              <Input
                value={name[locale] ?? ""}
                onChange={(event) => setName((current) => ({ ...current, [locale]: event.target.value }))}
              />
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="animate-spin" /> : shouldClearOnSave && <Plus />}
          {saveLabel}
        </Button>
      </CardContent>
    </Card>
  );
};

/** The subcategories of a store category, renamed in place, and a row to add a new one at the end. */
const SubcategoryList = ({ parentSlug, locales, subcategories }: SubcategoryListProps) => {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();

  const report = (result: { success: boolean; message: string }) => {
    toast({ variant: result.success ? "default" : "destructive", description: result.message });
    if (result.success) router.refresh();
    return result.success;
  };

  return (
    <div className="space-y-3">
      {subcategories.map((subcategory) => (
        <SubcategoryRow
          key={subcategory.id}
          locales={locales}
          initialName={subcategory.name}
          saveLabel={t("SUBCATEGORIES_SAVE")}
          onSave={async (name) => report(await updateSubcategory({ id: subcategory.id, name }))}
        />
      ))}
      <h3 className="pt-4 font-medium">{t("SUBCATEGORIES_NEW")}</h3>
      <SubcategoryRow
        locales={locales}
        initialName={{}}
        saveLabel={t("SUBCATEGORIES_ADD")}
        onSave={async (name) => report(await createSubcategory(parentSlug, { name }))}
        shouldClearOnSave
      />
    </div>
  );
};

export default SubcategoryList;
