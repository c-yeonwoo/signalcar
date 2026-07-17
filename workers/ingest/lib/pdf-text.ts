import { extractText, getDocumentProxy } from "unpdf";

export async function extractPdfText(bytes: Uint8Array): Promise<{
  totalPages: number;
  text: string;
}> {
  const pdf = await getDocumentProxy(bytes);
  const { totalPages, text } = await extractText(pdf, { mergePages: true });
  return { totalPages, text: typeof text === "string" ? text : String(text) };
}
