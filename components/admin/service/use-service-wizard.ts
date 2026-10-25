import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";
import { useToast } from "@/hooks/use-toast";
import { createService } from "@/lib/actions/service.actions";
import { insertServiceSchema } from "@/lib/validators";
import type { PhotoUpload, UploadHandlers } from "@/components/admin/studio/use-product-studio";

/** What the admin fills in on the details step. */
export interface ServiceDetails {
  name: string;
  description: string;
  subcategoryId: string;
  contactPhone: string;
  hasContactConsent: boolean;
}

const NO_UPLOAD: PhotoUpload = { status: "waiting", progress: 0, error: "" };

/** State of the service wizard: a photo, the details, then a check before publishing. */
export function useServiceWizard(firstSubcategoryId: string) {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();

  const [photoUrl, setPhotoUrl] = useState<string>();
  const [upload, setUpload] = useState<PhotoUpload>(NO_UPLOAD);
  const [isChecking, setIsChecking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [details, setDetails] = useState<ServiceDetails>({
    name: "",
    description: "",
    subcategoryId: firstSubcategoryId,
    contactPhone: "+34 ",
    hasContactConsent: false,
  });

  const updateDetails = (change: Partial<ServiceDetails>) => setDetails((current) => ({ ...current, ...change }));

  const uploadHandlers: UploadHandlers = {
    onBegin: () => setUpload({ ...NO_UPLOAD, status: "working" }),
    onProgress: (progress) => setUpload((current) => ({ ...current, progress })),
    onComplete: (url) => {
      setUpload({ ...NO_UPLOAD, status: "done" });
      setPhotoUrl(url);
    },
    onError: (error) => setUpload((current) => ({ ...current, status: "failed", error })),
  };

  // The same check as the server, so a missing field shows before the last step.
  const showCheck = () => {
    const result = insertServiceSchema.safeParse({ ...details, image: photoUrl });
    if (!result.success) return toast({ variant: "destructive", description: result.error.issues[0].message });
    setIsChecking(true);
  };

  const publish = async () => {
    if (!photoUrl) return;
    setIsSaving(true);
    const result = await createService({ ...details, image: photoUrl, hasContactConsent: true });
    setIsSaving(false);
    if (!result.success) return toast({ variant: "destructive", description: result.message });
    toast({ description: t("SERVICE_CREATED") });
    router.push(`/product/${result.slug}`);
  };

  const startOver = () => {
    setPhotoUrl(undefined);
    setUpload(NO_UPLOAD);
    setIsChecking(false);
  };

  // The photo step is simply "no photo yet"; uploading one moves on by itself.
  const step = !photoUrl ? 0 : isChecking ? 2 : 1;

  return {
    step,
    photoUrl,
    upload,
    uploadHandlers,
    details,
    updateDetails,
    isSaving,
    showCheck,
    showDetails: () => setIsChecking(false),
    startOver,
    publish,
  };
}
