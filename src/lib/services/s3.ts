import { uploadFile } from "../models/s3";

export class S3Service {
  userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  async uploadFile(file: File, path: string) {
    return await uploadFile(file, path);
  }
}
