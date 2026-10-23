"use client";

import { ArrowRight } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import GeneratedViewCard from "./studio/generated-view-card";
import OriginalPhotoCard from "./studio/original-photo-card";
import StudioDetailsForm from "./studio/studio-details-form";
import StudioProgress from "./studio/studio-progress";
import StoreCategorySelect from "./studio/store-category-select";
import { VIEWS, useProductStudio, type StudioStoreCategory } from "./studio/use-product-studio";
import WizardSteps from "./studio/wizard-steps";

interface ProductStudioProps {
  categories: string[];
  brand: string;
  storeCategories: StudioStoreCategory[];
  initialStoreCategoryId?: string;
}

/** Wizard from one ring photo to a new product: photo, AI pictures, then details. */
const ProductStudio = ({ categories, brand, storeCategories, initialStoreCategoryId }: ProductStudioProps) => {
  const { t } = useI18n();
  const studio = useProductStudio({ categories, brand, initialStoreCategoryId });
  const { step, photoUrl } = studio;

  return (
    <div className="space-y-8">
      <WizardSteps current={step} />

      {step < 2 && storeCategories.length > 0 && (
        <StoreCategorySelect
          categories={storeCategories}
          value={studio.storeCategoryId}
          onChange={studio.setStoreCategoryId}
        />
      )}

      {step < 2 && (
        <div
          className={cn(
            "grid gap-4",
            photoUrl ? "sm:grid-cols-2 lg:grid-cols-4" : "mx-auto max-w-md",
          )}
        >
          <OriginalPhotoCard
            photoUrl={photoUrl}
            upload={studio.upload}
            handlers={studio.uploadHandlers}
          />
          {photoUrl &&
            VIEWS.map(({ view, label }) => (
              <GeneratedViewCard
                key={view}
                label={label}
                picture={studio.pictures[view]}
                onRedo={() => studio.redoView(view)}
                onToggleRemoved={() => studio.toggleRemoved(view)}
              />
            ))}
        </div>
      )}

      {step === 1 && (
        <>
          <StudioProgress steps={studio.steps} />
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Button type="button" variant="ghost" onClick={studio.startOver}>
              {t("STUDIO_NEW_PHOTO")}
            </Button>
            <Button type="button" size="lg" onClick={studio.showDetails}>
              {t("STUDIO_NEXT")} <ArrowRight />
            </Button>
          </div>
        </>
      )}

      {step === 2 && (
        <StudioDetailsForm
          categories={categories}
          details={studio.details}
          onChange={studio.updateDetails}
          infoUrl={studio.infoUrl}
          onInfoUpload={studio.handleInfoUpload}
          onInfoRemove={studio.removeInfo}
          isWriting={studio.isWriting}
          onWriteText={studio.rewriteText}
          isSaving={studio.isSaving}
          canSave={!studio.isBusy}
          onBack={studio.showPictures}
          onSave={studio.save}
        />
      )}
    </div>
  );
};

export default ProductStudio;
