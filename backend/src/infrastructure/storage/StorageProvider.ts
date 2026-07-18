export interface StorageProvider {
  /**
   * Uploads a file to the storage provider.
   * @param fileBuffer The binary content of the file.
   * @param originalName The original file name.
   * @param mimeType The MIME type of the file.
   * @param pathPrefix Optional prefix/directory path (e.g. 'evidence/userId/sessionId').
   * @returns The storage path/identifier needed to retrieve or delete the file later.
   */
  upload(fileBuffer: Buffer, originalName: string, mimeType: string, pathPrefix: string): Promise<string>;

  /**
   * Downloads a file from the storage provider.
   * @param storagePath The storage path returned from upload().
   * @returns The file buffer.
   */
  download(storagePath: string): Promise<Buffer>;

  /**
   * Deletes a file from the storage provider.
   * @param storagePath The storage path returned from upload().
   */
  delete(storagePath: string): Promise<void>;

  /**
   * Returns a publicly accessible URL for the file.
   * @param storagePath The storage path returned from upload().
   */
  getPublicUrl(storagePath: string): Promise<string>;
}
