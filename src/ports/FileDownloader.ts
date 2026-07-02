export interface FileDownloadRequest {
  readonly url: string
  readonly token: string
  readonly outPath: string
}

export interface FileDownloadResult {
  readonly path: string
  readonly bytes: number
}

export interface FileDownloader {
  download(input: FileDownloadRequest): Promise<FileDownloadResult>
}
