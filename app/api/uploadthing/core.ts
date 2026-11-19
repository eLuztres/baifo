import { createUploadthing, type FileRouter } from 'uploadthing/next';
import { UploadThingError } from 'uploadthing/server';
import { auth } from '@/auth';
import { getSignedInPartner } from '@/lib/partner-access';

const f = createUploadthing();

/** The admin, or a partner in its panel (its listing editor uploads photos and videos too). */
async function uploaderOf() {
  const session = await auth();
  if (session?.user?.role === 'admin') return { userId: session.user.id };
  const partner = await getSignedInPartner();
  if (partner) return { userId: `partner:${partner.id}` };
  throw new UploadThingError('Unauthorized');
}

export const ourFileRouter = {
  imageUploader: f({
      'image/jpeg': { maxFileSize: '4MB' },
      'image/png': { maxFileSize: '4MB' },
      'video/mp4': { maxFileSize: '16MB' }
  })

    .middleware(async () => {
      // Only the admin product tools and a partner's listing editor upload; customers could otherwise fill the shop's storage.
      return uploaderOf();
    })
    .onUploadComplete(async ({ metadata }) => {
      return { uploadedBy: metadata.userId };
    }),
  // Several product photos at once (the shop's own admin tools).
  photosUploader: f({
    'image/jpeg': { maxFileSize: '4MB', maxFileCount: 8 },
    'image/png': { maxFileSize: '4MB', maxFileCount: 8 },
  })
    .middleware(uploaderOf)
    .onUploadComplete(async ({ metadata }) => {
      return { uploadedBy: metadata.userId };
    }),
  // A short video of a service, kept as it is (no AI can edit videos).
  videosUploader: f({
    'video/mp4': { maxFileSize: '64MB', maxFileCount: 2 },
    'video/quicktime': { maxFileSize: '64MB', maxFileCount: 2 },
    'video/webm': { maxFileSize: '64MB', maxFileCount: 2 },
  })
    .middleware(uploaderOf)
    .onUploadComplete(async ({ metadata }) => {
      return { uploadedBy: metadata.userId };
    }),
} satisfies FileRouter;
export type OurFileRouter = typeof ourFileRouter;
