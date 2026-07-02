import { beforeEach, describe, expect, it, vi } from "vitest";

const s3Mocks = vi.hoisted(() => ({
  send: vi.fn(),
  commands: [] as Array<Record<string, unknown>>,
}));

vi.mock("@aws-sdk/client-s3", () => ({
  PutObjectCommand: class {
    constructor(input: Record<string, unknown>) {
      s3Mocks.commands.push(input);
    }
  },
  S3Client: class {
    send = s3Mocks.send;
  },
}));

function pngBytes() {
  return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}

async function importUploadFile() {
  vi.resetModules();

  process.env.S3_ENDPOINT = "https://s3.example.com";
  process.env.S3_ACCESS_KEY_ID = "access-key";
  process.env.S3_SECRET_ACCESS_KEY = "secret-key";
  process.env.S3_BUCKET = "bucket";
  process.env.S3_PUBLIC_URL = "https://cdn.example.com";

  return await import("../lib/models/s3");
}

describe("uploadFile", () => {
  beforeEach(() => {
    s3Mocks.send.mockReset();
    s3Mocks.commands.length = 0;
  });

  it("uploads validated images with a UUID object key", async () => {
    const { uploadFile } = await importUploadFile();
    const file = new File([pngBytes()], "original-name.png", { type: "image/png" });

    const url = await uploadFile(file, "medias");

    expect(s3Mocks.send).toHaveBeenCalledTimes(1);
    expect(s3Mocks.commands).toHaveLength(1);
    expect(s3Mocks.commands[0]).toMatchObject({
      Bucket: "bucket",
      Body: Buffer.from(pngBytes()),
      ContentType: "image/png",
    });
    expect(s3Mocks.commands[0]?.Key).toMatch(
      /^medias\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$/,
    );
    expect(String(s3Mocks.commands[0]?.Key)).not.toContain("original-name");
    expect(url).toBe(`https://cdn.example.com/${s3Mocks.commands[0]?.Key}`);
  });

  it("rejects unsupported MIME types before uploading", async () => {
    const { uploadFile } = await importUploadFile();
    const file = new File([pngBytes()], "image.svg", { type: "image/svg+xml" });

    await expect(uploadFile(file, "medias")).rejects.toThrow("업로드할 수 없는 파일 형식입니다.");
    expect(s3Mocks.send).not.toHaveBeenCalled();
  });

  it("rejects files whose bytes are not an allowed image", async () => {
    const { uploadFile } = await importUploadFile();
    const file = new File(["not an image"], "image.png", { type: "image/png" });

    await expect(uploadFile(file, "medias")).rejects.toThrow(
      "실제 이미지 파일만 업로드할 수 있습니다.",
    );
    expect(s3Mocks.send).not.toHaveBeenCalled();
  });

  it("rejects files larger than 10MB before uploading", async () => {
    const { uploadFile } = await importUploadFile();
    const bytes = new Uint8Array(10 * 1024 * 1024 + 1);
    bytes.set(pngBytes());
    const file = new File([bytes], "large.png", { type: "image/png" });

    await expect(uploadFile(file, "medias")).rejects.toThrow(
      "파일 크기는 10MB를 초과할 수 없습니다.",
    );
    expect(s3Mocks.send).not.toHaveBeenCalled();
  });

  it("wraps S3 upload errors", async () => {
    s3Mocks.send.mockRejectedValueOnce(new Error("provider failed"));
    const { uploadFile } = await importUploadFile();
    const file = new File([pngBytes()], "image.png", { type: "image/png" });

    await expect(uploadFile(file, "medias")).rejects.toThrow("파일 업로드에 실패했습니다.");
  });
});
