import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

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

export async function uploadFile(file: File, path: string) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${file.name}-${Date.now()}.${file.type.split("/")[1]}`;

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: `${path}/${filename}`,
    Body: buffer,
    ContentType: file.type,
  });

  await client.send(command);

  return `${process.env.S3_PUBLIC_URL}/${path}/${filename}`;
}
