import { mkdir, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import { SlackApiFailed } from "../../domain/errors.js"
import type { FileDownloader, FileDownloadRequest, FileDownloadResult } from "../../ports/FileDownloader.js"

export class HttpFileDownloader implements FileDownloader {
  async download(input: FileDownloadRequest): Promise<FileDownloadResult> {
    const response = await fetch(input.url, {
      headers: { authorization: `Bearer ${input.token}` }
    })
    if (!response.ok) {
      throw new SlackApiFailed(`Slack file download failed with HTTP ${response.status}`, {
        status: response.status,
        url: input.url
      })
    }
    const data = Buffer.from(await response.arrayBuffer())
    await mkdir(dirname(input.outPath), { recursive: true })
    await writeFile(input.outPath, data, { mode: 0o600 })
    return { path: input.outPath, bytes: data.byteLength }
  }
}
