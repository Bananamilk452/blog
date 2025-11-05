"use server";

import { S3Service } from "../services/s3";
import { getValidAdminSession } from "../utils-server";

export async function uploadFile(file: File, path: string = "medias") {
  const session = await getValidAdminSession();

  const s3Service = new S3Service(session.user.id);

  return await s3Service.uploadFile(file, path);
}
