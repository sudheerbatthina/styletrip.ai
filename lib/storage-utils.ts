import { stripDataUrlPrefix } from "@/lib/image-utils";

const mimeToExtension: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

export function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+);base64,/);
  const mimeType = match?.[1] ?? "image/png";
  return {
    buffer: Buffer.from(stripDataUrlPrefix(dataUrl), "base64"),
    mimeType,
    extension: mimeToExtension[mimeType] ?? "png",
  };
}

export async function imageStringToUploadable(image: string) {
  if (image.startsWith("data:")) {
    return parseDataUrl(image);
  }

  const response = await fetch(image);
  if (!response.ok) {
    throw new Error("Could not fetch generated image for storage.");
  }

  const mimeType = response.headers.get("content-type") ?? "image/png";
  const arrayBuffer = await response.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType,
    extension: mimeToExtension[mimeType] ?? "png",
  };
}
