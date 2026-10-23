import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import slugify from "slugify";
import { useI18n } from "@/components/i18n-provider";
import { useToast } from "@/hooks/use-toast";
import { createProduct } from "@/lib/actions/product.actions";
import { draftRingText } from "@/lib/actions/studio.actions";
import type { TranslationKey } from "@/lib/i18n-core";

export type View = "hero" | "side" | "top";

export type StepStatus = "waiting" | "working" | "done" | "failed";

export interface ProgressStep {
  label: TranslationKey;
  status: StepStatus;
}

export interface Picture {
  url?: string;
  isLoading: boolean;
  /** A message from the server (translation key or text). */
  error?: string;
  isRemoved: boolean;
}

export interface PhotoUpload {
  status: StepStatus;
  progress: number;
  error: string;
}

export interface UploadHandlers {
  onBegin: () => void;
  onProgress: (progress: number) => void;
  onComplete: (url: string) => void;
  onError: (message: string) => void;
}

/** What the admin fills in on the details step (the AI writes name and description). */
export interface StudioDetails {
  notes: string;
  name: string;
  description: string;
  price: string;
  stock: string;
  category: string;
}

interface RingViewResult {
  success: boolean;
  message: string;
  url?: string;
}

/** A category of the store's ring, as the studio's select shows it. */
export interface StudioStoreCategory {
  id: string;
  name: string;
}

interface UseProductStudioOptions {
  categories: string[];
  brand: string;
  /** The store category picked first, e.g. from the "add a ring" button on the store's ring. */
  initialStoreCategoryId?: string;
}

// The hero comes first: it becomes the main shop picture instead of the raw photo.
export const VIEWS: { view: View; label: TranslationKey }[] = [
  { view: "hero", label: "STUDIO_VIEW_HERO" },
  { view: "side", label: "STUDIO_VIEW_SIDE" },
  { view: "top", label: "STUDIO_VIEW_TOP" },
];

const EMPTY_PICTURE: Picture = { isLoading: false, isRemoved: false };
const EMPTY_PICTURES: Record<View, Picture> = {
  hero: EMPTY_PICTURE,
  side: EMPTY_PICTURE,
  top: EMPTY_PICTURE,
};
const NO_UPLOAD: PhotoUpload = { status: "waiting", progress: 0, error: "" };

const emptyDetails = (category: string): StudioDetails => ({
  notes: "",
  name: "",
  description: "",
  price: "",
  stock: "1",
  category,
});

const pictureStatus = (picture: Picture): StepStatus =>
  picture.isLoading
    ? "working"
    : picture.url
      ? "done"
      : picture.error
        ? "failed"
        : "waiting";

/** State and AI calls of the product studio: one photo in, shop pictures, text and a new product out. */
export function useProductStudio({ categories, brand, initialStoreCategoryId }: UseProductStudioOptions) {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();

  const [photoUrl, setPhotoUrl] = useState<string>();
  // Sets the AI scene of the views, so it is picked before the photo.
  const [storeCategoryId, setStoreCategoryId] = useState(initialStoreCategoryId ?? "");
  const [upload, setUpload] = useState<PhotoUpload>(NO_UPLOAD);
  const [pictures, setPictures] = useState(EMPTY_PICTURES);
  const [infoUrl, setInfoUrl] = useState<string>();
  const [details, setDetails] = useState(() => emptyDetails(categories[0] ?? ""));
  const [textStatus, setTextStatus] = useState<StepStatus>("waiting");
  const [isSaving, setIsSaving] = useState(false);
  const [isOnDetails, setIsOnDetails] = useState(false);
  // A view takes 30-90 s: startOver bumps this, so results for the previous photo are dropped.
  const photoRun = useRef(0);
  // Only the newest text request may fill in name and description.
  const textRun = useRef(0);

  const updatePicture = (view: View, change: Partial<Picture>) =>
    setPictures((current) => ({
      ...current,
      [view]: { ...current[view], ...change },
    }));

  const updateDetails = (change: Partial<StudioDetails>) =>
    setDetails((current) => ({ ...current, ...change }));

  const createView = async (url: string, view: View) => {
    const run = photoRun.current;
    updatePicture(view, { isLoading: true, error: undefined, isRemoved: false });
    const result: RingViewResult = await fetch("/api/studio/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoUrl: url, view, categoryId: storeCategoryId || undefined }),
    })
      .then((response) => response.json())
      .catch(() => ({ success: false, message: "ERROR_GENERIC" }));
    if (run !== photoRun.current) return;
    updatePicture(view, {
      isLoading: false,
      url: result.url,
      error: result.success ? undefined : result.message,
    });
  };

  const writeText = async (url: string, notes: string, info?: string) => {
    const run = ++textRun.current;
    setTextStatus("working");
    const result = await draftRingText(url, notes, info);
    if (run !== textRun.current) return;
    setTextStatus(result.success ? "done" : "failed");
    if (!result.success)
      return toast({ variant: "destructive", description: result.message });
    updateDetails({ name: result.name ?? "", description: result.description ?? "" });
  };

  // One photo starts everything at once: all views and the text.
  const handleUpload = (url: string) => {
    setUpload({ ...NO_UPLOAD, status: "done" });
    toast({ description: `✓ ${t("STUDIO_UPLOADED")}` });
    setPhotoUrl(url);
    VIEWS.forEach(({ view }) => createView(url, view));
    writeText(url, details.notes, infoUrl);
  };

  const uploadHandlers: UploadHandlers = {
    onBegin: () => setUpload({ ...NO_UPLOAD, status: "working" }),
    onProgress: (progress) => setUpload((current) => ({ ...current, progress })),
    onComplete: handleUpload,
    onError: (error) => setUpload((current) => ({ ...current, status: "failed", error })),
  };

  // A new info photo rewrites the text at once, so its details show up without another click.
  const handleInfoUpload = (url: string) => {
    setInfoUrl(url);
    if (photoUrl) writeText(photoUrl, details.notes, url);
  };

  const startOver = () => {
    photoRun.current++;
    textRun.current++;
    setPhotoUrl(undefined);
    setIsOnDetails(false);
    setInfoUrl(undefined);
    setUpload(NO_UPLOAD);
    setTextStatus("waiting");
    setPictures(EMPTY_PICTURES);
    // The next ring is often in the same category; everything else belonged to the previous one.
    setDetails((current) => emptyDetails(current.category));
  };

  const handleSave = async () => {
    if (!photoUrl)
      return toast({ variant: "destructive", description: t("STUDIO_NEED_PHOTO") });
    const views = VIEWS.map(({ view }) => pictures[view]).filter(
      (picture) => picture.url && !picture.isRemoved,
    );

    setIsSaving(true);
    const result = await createProduct({
      name: details.name,
      slug: slugify(details.name, { lower: true, strict: true }),
      category: details.category,
      brand,
      description: details.description,
      stock: Number(details.stock),
      // Without a hero picture the raw photo stays first, so the product never lacks a main image.
      images: [
        ...(pictures.hero.url && !pictures.hero.isRemoved ? [] : [photoUrl]),
        ...views.map((picture) => picture.url!),
      ],
      isFeatured: false,
      banner: null,
      sourceImage: photoUrl,
      categoryIds: storeCategoryId ? [storeCategoryId] : [],
      price: Number(details.price.replace(",", ".") || 0).toFixed(2),
    });
    setIsSaving(false);

    if (!result.success)
      return toast({ variant: "destructive", description: result.message });
    toast({ description: t("STUDIO_SAVED") });
    router.push("/admin/products");
  };

  const isWriting = textStatus === "working";
  const isBusy = isWriting || VIEWS.some(({ view }) => pictures[view].isLoading);
  const steps: ProgressStep[] = [
    { label: "STUDIO_STEP_PHOTO", status: upload.status },
    ...VIEWS.map(({ view, label }) => ({
      label,
      status: pictureStatus(pictures[view]),
    })),
    { label: "STUDIO_STEP_TEXT", status: textStatus },
  ];
  // The photo step is simply "no photo yet"; uploading one moves on by itself.
  const step = !photoUrl ? 0 : isOnDetails ? 2 : 1;

  return {
    step,
    steps,
    photoUrl,
    storeCategoryId,
    setStoreCategoryId,
    upload,
    uploadHandlers,
    pictures,
    infoUrl,
    details,
    isWriting,
    isBusy,
    isSaving,
    redoView: (view: View) => photoUrl && createView(photoUrl, view),
    toggleRemoved: (view: View) =>
      updatePicture(view, { isRemoved: !pictures[view].isRemoved }),
    rewriteText: () => photoUrl && writeText(photoUrl, details.notes, infoUrl),
    handleInfoUpload,
    removeInfo: () => setInfoUrl(undefined),
    updateDetails,
    startOver,
    showDetails: () => setIsOnDetails(true),
    showPictures: () => setIsOnDetails(false),
    save: handleSave,
  };
}
