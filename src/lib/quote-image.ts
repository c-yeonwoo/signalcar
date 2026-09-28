export const MAX_QUOTE_IMAGE_BYTES = 5 * 1024 * 1024;

type QuoteImage = { contentType: "image/jpeg" | "image/png"; extension: "jpg" | "png" };

export async function validateQuoteImage(file: File): Promise<QuoteImage> {
  if (file.size === 0 || file.size > MAX_QUOTE_IMAGE_BYTES) {
    throw new Error("이미지는 5MB 이하의 JPG 또는 PNG 파일만 올릴 수 있어요.");
  }

  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
    (byte, index) => bytes[index] === byte,
  );

  if (file.type === "image/jpeg" && jpeg) return { contentType: "image/jpeg", extension: "jpg" };
  if (file.type === "image/png" && png) return { contentType: "image/png", extension: "png" };
  throw new Error("JPG 또는 PNG 이미지인지 확인해주세요. 파일 이름만 바꾼 파일은 올릴 수 없어요.");
}

export function quoteImagePath(userId: string, extension: QuoteImage["extension"]): string {
  return `${userId}/${crypto.randomUUID()}.${extension}`;
}
