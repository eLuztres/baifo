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
} satisfies FileRouter;
export type OurFileRouter = typeof ourFileRouter;
