"use client";

import { X } from "lucide-react";
import ProductMedia from "@/components/ProductMedia";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { preparePhotos } from "@/lib/prepare-photos";
import { UploadButton } from "@/lib/uploadthing";

interface InfoPhotoUploadProps {
  url?: string;
  onUpload: (url: string) => void;
  onRemove: () => void;
}

/** The info photo (the maker's note or label) for the AI text: a thumbnail to remove, or the upload button. */
const InfoPhotoUpload = ({ url, onUpload, onRemove }: InfoPhotoUploadProps) => {
  const { t } = useI18n();
  const { toast } = useToast();

  if (url) {
    return (
      <div className="flex items-center gap-3">
        <div className="relative size-20 overflow-hidden rounded-lg bg-muted">
          <ProductMedia src={url} alt={t("STUDIO_INFO_PHOTO")} fill />
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={onRemove}>
          <X /> {t("STUDIO_REMOVE")}
        </Button>
      </div>
    );
  }

  return (
    <UploadButton
      endpoint="imageUploader"
      onBeforeUploadBegin={preparePhotos}
      className="items-start"
      appearance={{
        button: "bg-secondary text-secondary-foreground px-4 text-sm",
        allowedContent: "text-muted-foreground",
      }}
      onClientUploadComplete={(files) => files[0] && onUpload(files[0].ufsUrl)}
      onUploadError={() => {
        toast({ variant: "destructive", description: t("STUDIO_UPLOAD_FAILED") });
      }}
    />
  );
};

export default InfoPhotoUpload;
