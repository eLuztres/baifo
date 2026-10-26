import { createUploadthing, type FileRouter } from 'uploadthing/next';
import { UploadThingError } from 'uploadthing/server';
import { auth } from '@/auth';

const f = createUploadthing();

export const ourFileRouter = {
  imageUploader: f({
      'image/jpeg': { maxFileSize: '4MB' },
      'image/png': { maxFileSize: '4MB' },
      'video/mp4': { maxFileSize: '16MB' }
  })

    .middleware(async () => {
      // Only the admin product tools upload; customers could otherwise fill the shop's storage.
      const session = await auth();
      if (session?.user?.role !== 'admin') throw new UploadThingError('Unauthorized');
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata }) => {
      return { uploadedBy: metadata.userId };
    }),
  // Several product photos at once (the shop's own admin tools).
  photosUploader: f({
    'image/jpeg': { maxFileSize: '4MB', maxFileCount: 8 },
    'image/png': { maxFileSize: '4MB', maxFileCount: 8 },
  })
    .middleware(async () => {
      const session = await auth();
      if (session?.user?.role !== 'admin') throw new UploadThingError('Unauthorized');
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata }) => {
      return { uploadedBy: metadata.userId };
    }),
  // A short video of a service, kept as it is (no AI can edit videos).
  videosUploader: f({
    'video/mp4': { maxFileSize: '64MB', maxFileCount: 2 },
    'video/quicktime': { maxFileSize: '64MB', maxFileCount: 2 },
    'video/webm': { maxFileSize: '64MB', maxFileCount: 2 },
  })
    .middleware(async () => {
      const session = await auth();
      if (session?.user?.role !== 'admin') throw new UploadThingError('Unauthorized');
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata }) => {
      return { uploadedBy: metadata.userId };
    }),
} satisfies FileRouter;
export type OurFileRouter = typeof ourFileRouter;
