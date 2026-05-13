import { MAX_UPLOAD_BYTES } from "@/lib/schemas";

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export function validateImageFile(file: File) {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    return "Use a JPG, PNG, or WEBP image.";
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return "Images must be 8 MB or smaller.";
  }

  return null;
}

export function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read this image."));
    reader.readAsDataURL(file);
  });
}

export function stripDataUrlPrefix(dataUrl: string) {
  const [, base64] = dataUrl.split(",");
  return base64 ?? dataUrl;
}
