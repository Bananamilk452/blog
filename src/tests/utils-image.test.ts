import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { convertImageBufferToWebp } from "../lib/utils-image";

describe("convertImageBufferToWebp", () => {
  it("converts supported image buffers to webp", async () => {
    const input = await sharp({
      create: {
        width: 16,
        height: 16,
        channels: 3,
        background: "red",
      },
    })
      .png()
      .toBuffer();

    const output = await convertImageBufferToWebp(input);
    const metadata = await sharp(output).metadata();

    expect(Buffer.isBuffer(output)).toBe(true);
    expect(metadata.format).toBe("webp");
  });
});
