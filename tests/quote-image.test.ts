import { describe, expect, test } from "bun:test";
import { MAX_QUOTE_IMAGE_BYTES, quoteImagePath, validateQuoteImage } from "../src/lib/quote-image";

const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const jpegHeader = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);

describe("quote image upload validation", () => {
  test("accepts matching JPEG and PNG signatures", async () => {
    expect(await validateQuoteImage(new File([jpegHeader], "private-name.jpg", { type: "image/jpeg" }))).toEqual({
      contentType: "image/jpeg",
      extension: "jpg",
    });
    expect(await validateQuoteImage(new File([pngHeader], "quote.png", { type: "image/png" }))).toEqual({
      contentType: "image/png",
      extension: "png",
    });
  });

  test("rejects mismatched content, SVG and oversized files", async () => {
    await expect(validateQuoteImage(new File([pngHeader], "fake.jpg", { type: "image/jpeg" }))).rejects.toThrow();
    await expect(validateQuoteImage(new File(["<svg />"], "quote.svg", { type: "image/svg+xml" }))).rejects.toThrow();
    await expect(validateQuoteImage(new File([new Uint8Array(MAX_QUOTE_IMAGE_BYTES + 1)], "large.png", { type: "image/png" }))).rejects.toThrow();
  });

  test("does not put the original filename in the storage path", () => {
    const path = quoteImagePath("user-123", "jpg");
    expect(path).toMatch(/^user-123\/[0-9a-f-]+\.jpg$/);
    expect(path).not.toContain("private-name");
  });
});
