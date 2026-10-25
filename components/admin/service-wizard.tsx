"use client";

import { ArrowLeft, ArrowRight, Loader2, MessageCircle } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import ProductMedia from "@/components/ProductMedia";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { TranslationKey } from "@/lib/i18n-core";
import OriginalPhotoCard from "./studio/original-photo-card";
import WizardSteps from "./studio/wizard-steps";
import { useServiceWizard } from "./service/use-service-wizard";

/** A subcategory of Servicios, as the select shows it. */
export interface ServiceSubcategory {
  id: string;
  name: string;
}

interface ServiceWizardProps {
  subcategories: ServiceSubcategory[];
}

const SERVICE_STEPS: TranslationKey[] = ["STUDIO_STEP_PHOTO", "STUDIO_WIZARD_DETAILS", "SERVICE_STEP_CHECK"];

/** Wizard for a new service: the person's photo as it is, their details and contact, then a check. No price. */
const ServiceWizard = ({ subcategories }: ServiceWizardProps) => {
  const { t } = useI18n();
  const wizard = useServiceWizard(subcategories[0]?.id ?? "");
  const { step, photoUrl, details, updateDetails } = wizard;
  const subcategoryName = subcategories.find(({ id }) => id === details.subcategoryId)?.name;

  return (
    <div className="space-y-8">
      <WizardSteps current={step} steps={SERVICE_STEPS} />

      {step === 0 && (
        <div className="mx-auto max-w-md">
          <OriginalPhotoCard photoUrl={photoUrl} upload={wizard.upload} handlers={wizard.uploadHandlers} />
        </div>
      )}

      {step === 1 && (
        <Card>
          <CardContent className="grid gap-5 p-5 md:grid-cols-[12rem_1fr]">
            <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-muted">
              <ProductMedia src={photoUrl!} alt={details.name} fill />
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="service-name">{t("SERVICE_NAME")}</Label>
                <Input
                  id="service-name"
                  value={details.name}
                  placeholder={t("SERVICE_NAME_PLACEHOLDER")}
                  onChange={(event) => updateDetails({ name: event.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="service-subcategory">{t("SERVICE_SUBCATEGORY")}</Label>
                <select
                  id="service-subcategory"
                  value={details.subcategoryId}
                  onChange={(event) => updateDetails({ subcategoryId: event.target.value })}
                  className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                >
                  {subcategories.map((subcategory) => (
                    <option key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="service-description">{t("STUDIO_DESCRIPTION")}</Label>
                <Textarea
                  id="service-description"
                  rows={5}
                  value={details.description}
                  placeholder={t("SERVICE_DESCRIPTION_PLACEHOLDER")}
                  onChange={(event) => updateDetails({ description: event.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="service-phone">{t("SERVICE_PHONE")}</Label>
                <Input
                  id="service-phone"
                  type="tel"
                  inputMode="tel"
                  value={details.contactPhone}
                  onChange={(event) => updateDetails({ contactPhone: event.target.value })}
                />
                <p className="text-xs text-muted-foreground">{t("SERVICE_PHONE_HINT")}</p>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="service-consent"
                  checked={details.hasContactConsent}
                  onCheckedChange={(checked) => updateDetails({ hasContactConsent: checked === true })}
                  className="mt-0.5"
                />
                <Label htmlFor="service-consent" className="leading-snug font-normal">
                  {t("SERVICE_CONSENT")}
                </Label>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between md:col-span-2">
              <Button type="button" variant="ghost" onClick={wizard.startOver}>
                {t("STUDIO_NEW_PHOTO")}
              </Button>
              <Button type="button" size="lg" onClick={wizard.showCheck}>
                {t("STUDIO_NEXT")} <ArrowRight />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="mx-auto max-w-2xl">
          <CardContent className="grid gap-5 p-5 sm:grid-cols-[12rem_1fr]">
            <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-muted">
              <ProductMedia src={photoUrl!} alt={details.name} fill />
            </div>
            <div className="space-y-3">
              <p className="eyebrow">{subcategoryName}</p>
              <h3 className="text-2xl leading-tight">{details.name}</h3>
              <p className="whitespace-pre-line text-sm leading-6 text-foreground/85">{details.description}</p>
              <p className="flex items-center gap-2 text-sm font-medium">
                <MessageCircle className="size-4 text-primary" /> {details.contactPhone}
              </p>
              <p className="text-xs text-muted-foreground">{t("SERVICE_CHECK_HINT")}</p>
            </div>
            <div className="flex flex-col-reverse gap-3 sm:col-span-2 sm:flex-row sm:justify-between">
              <Button type="button" variant="ghost" onClick={wizard.showDetails} disabled={wizard.isSaving}>
                <ArrowLeft /> {t("STUDIO_BACK")}
              </Button>
              <Button type="button" size="lg" onClick={wizard.publish} disabled={wizard.isSaving}>
                {wizard.isSaving && <Loader2 className="animate-spin" />}
                {wizard.isSaving ? t("STUDIO_SAVING") : t("SERVICE_PUBLISH")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ServiceWizard;
