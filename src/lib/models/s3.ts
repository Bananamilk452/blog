import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

import { convertImageBufferToWebp } from "../utils-image";

if (
  !process.env.S3_ENDPOINT ||
  !process.env.S3_ACCESS_KEY_ID ||
  !process.env.S3_SECRET_ACCESS_KEY ||
  !process.env.S3_BUCKET ||
  !process.env.S3_PUBLIC_URL
) {
  throw new Error("S3 환경 변수가 설정되지 않았습니다.");
}

const client = new S3Client({
  region: "auto",
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
});

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
]);

function detectImageType(buffer: Buffer) {
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
    return "image/jpeg";
  }

  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }

  if (
    buffer.subarray(0, 6).equals(Buffer.from("GIF87a")) ||
    buffer.subarray(0, 6).equals(Buffer.from("GIF89a"))
  ) {
    return "image/gif";
  }

  if (
    buffer.subarray(0, 4).equals(Buffer.from("RIFF")) &&
    buffer.subarray(8, 12).equals(Buffer.from("WEBP"))
  ) {
    return "image/webp";
  }

  if (buffer.subarray(4, 12).equals(Buffer.from("ftypavif"))) {
    return "image/avif";
  }
}

function validateUploadFile(file: File, buffer: Buffer) {
  if (file.size === 0 || buffer.length === 0) {
    throw new Error("빈 파일은 업로드할 수 없습니다.");
  }

  if (file.size > MAX_UPLOAD_SIZE || buffer.length > MAX_UPLOAD_SIZE) {
    throw new Error("파일 크기는 10MB를 초과할 수 없습니다.");
  }

  if (file.type && !ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("업로드할 수 없는 파일 형식입니다.");
  }

  const detectedType = detectImageType(buffer);

  if (!detectedType || !ALLOWED_IMAGE_TYPES.has(detectedType)) {
    throw new Error("실제 이미지 파일만 업로드할 수 있습니다.");
  }

  if (file.type && file.type !== detectedType) {
    throw new Error("파일 형식과 실제 이미지 형식이 일치하지 않습니다.");
  }
}

export async function uploadFile(file: File, path: string) {
  const buffer = Buffer.from(await file.arrayBuffer());
  validateUploadFile(file, buffer);
  const optimizedBuffer = await convertImageBufferToWebp(buffer);
  const filename = `${randomUUID()}.webp`;

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: `${path}/${filename}`,
    Body: optimizedBuffer,
    ContentType: "image/webp",
  });

  try {
    await client.send(command);
  } catch {
    throw new Error("파일 업로드에 실패했습니다.");
  }

  return `${process.env.S3_PUBLIC_URL}/${path}/${filename}`;
}
