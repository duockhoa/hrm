"use client";

import AuthenticatedImage from "@/components/authenticated-image/authenticated-image";

export default function AttachmentImage({
  filePath,
  alt,
}: {
  filePath?: string | null;
  alt: string;
}) {
  if (!filePath) {
    return (
      <div className="flex h-64 items-center justify-center bg-gray-100 text-sm text-gray-500">
        Không có ảnh
      </div>
    );
  }

  return (
    <AuthenticatedImage
      src={filePath}
      alt={alt}
      className="h-64 w-full rounded-none border-0"
      height={256}
      width={640}
      loading="lazy"
      objectFit="contain"
    />
  );
}
