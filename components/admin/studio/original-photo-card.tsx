"use client";

import { AlertCircle, Check, Loader2 } from "lucide-react";
import ProductMedia from "@/components/ProductMedia";
import { useI18n } from "@/components/i18n-provider";
import { Card, CardContent } from "@/components/ui/card";
import { preparePhotos } from "@/lib/prepare-photos";
import { UploadDropzone } from "@/lib/uploadthing";
import type { PhotoUpload, UploadHandlers } from "./use-product-studio";

interface OriginalPhotoCardProps {
  photoUrl?: string;
  upload: PhotoUpload;
  handlers: UploadHandlers;
}

/** The ring photo: the upload dropzone with its progress, then the uploaded original. */
const OriginalPhotoCard = ({ photoUrl, upload, handlers }: OriginalPhotoCardProps) => {
  const { t } = useI18n();

  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-3 p-3">
        <p className="text-sm font-medium">{t("STUDIO_ORIGINAL")}</p>
        {photoUrl ? (
          <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-muted">
            <ProductMedia src={photoUrl} alt={t("STUDIO_ORIGINAL")} fill />
            <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-3 py-1 text-xs text-white">
              <Check className="size-3" /> {t("STUDIO_UPLOADED")}
            </span>
          </div>
        ) : (
          // The dropzone stays mounted during the upload; unmounting it would cancel the upload.
          <div className="relative">
            <UploadDropzone
              endpoint="imageUploader"
              onBeforeUploadBegin={preparePhotos}
              className="aspect-[3/4] rounded-lg border-border bg-muted/40"
              // Uploads as soon as a photo is dropped or picked, without a second click.
              config={{ mode: "auto" }}
              appearance={{
                label: "text-foreground",
                allowedContent: "text-muted-foreground",
                button: "bg-primary text-primary-foreground px-4",
              }}
              content={{ label: t("STUDIO_UPLOAD_HINT") }}
              onUploadBegin={handlers.onBegin}
              onUploadProgress={handlers.onProgress}
              onClientUploadComplete={(files) =>
                files[0] && handlers.onComplete(files[0].ufsUrl)
              }
              onUploadError={(error) => handlers.onError(error.message)}
            />
            {upload.status === "working" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-card/95 p-6">
                <Loader2 className="size-6 animate-spin text-primary" />
                <p className="text-sm">
                  {t("STUDIO_UPLOADING", { progress: upload.progress })}
                </p>
                <div className="h-1.5 w-full max-w-48 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
              </div>
            )}
            {upload.status === "failed" && (
              <div
                role="alert"
                className="mt-3 space-y-1 rounded-lg border border-destructive/50 p-3 text-sm"
              >
                <p className="flex items-center gap-2 font-medium text-destructive">
                  <AlertCircle className="size-4" /> {t("STUDIO_UPLOAD_FAILED")}
                </p>
                <p className="text-xs text-muted-foreground">{upload.error}</p>
                <p className="text-xs">{t("STUDIO_TRY_AGAIN")} ↑</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OriginalPhotoCard;
