import sharp from "sharp";

export async function convertImageBufferToWebp(buffer: Buffer) {
  return await sharp(buffer).rotate().webp({ quality: 85 }).toBuffer();
}
