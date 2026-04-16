import "server-only"

import { normalizeDriveMediaUrl } from "@/lib/google-drive"
import { createDbMediaAssetFromDataUrl } from "@/lib/server/google-sheets-media-assets"

type MediaKind = "attachment" | "image"

type NormalizeTaskMediaInput = {
  attachmentUrl?: string
  attachmentUrls?: string[]
  imageUrl?: string
  imageUrls?: string[]
  attachmentName?: string
}

type NormalizeTaskMediaOptions = {
  taskId: string
}
const DATA_URL_PREFIX = "data:"

const normalizeMaybeString = (value: unknown) => {
  if (value == null) return undefined
  return String(value).trim()
}

const toNormalizedUrlList = (primary?: string, list?: string[]) => {
  const values = [primary, ...(Array.isArray(list) ? list : [])]
  const normalized = values
    .map((value) => normalizeMaybeString(value))
    .filter((value): value is string => Boolean(value))

  return [...new Set(normalized)]
}

const isDataUrl = (value: string) => value.startsWith(DATA_URL_PREFIX) && value.includes(";base64,")

const ownerTypeByKind: Record<MediaKind, string> = {
  attachment: "task_attachment",
  image: "task_image",
}

const normalizeExistingDriveUrl = (value: string) => normalizeDriveMediaUrl(value)

export async function normalizeTaskMedia(
  input: NormalizeTaskMediaInput,
  options: NormalizeTaskMediaOptions,
): Promise<NormalizeTaskMediaInput> {
  const attachmentUrls = toNormalizedUrlList(input.attachmentUrl, input.attachmentUrls)
  const imageUrls = toNormalizedUrlList(input.imageUrl, input.imageUrls)
  let attachmentName = normalizeMaybeString(input.attachmentName)

  const normalizedAttachmentUrls: string[] = []
  for (const url of attachmentUrls) {
    if (isDataUrl(url)) {
      const persisted = await createDbMediaAssetFromDataUrl({
        dataUrl: url,
        ownerType: ownerTypeByKind.attachment,
        ownerId: options.taskId,
        originalFileName: attachmentName,
      })
      normalizedAttachmentUrls.push(persisted.url)
      attachmentName = attachmentName || persisted.fileName
      continue
    }

    const normalized = normalizeExistingDriveUrl(url)
    if (normalized) {
      normalizedAttachmentUrls.push(normalized)
    }
  }

  const normalizedImageUrls: string[] = []
  for (const url of imageUrls) {
    if (isDataUrl(url)) {
      const persisted = await createDbMediaAssetFromDataUrl({
        dataUrl: url,
        ownerType: ownerTypeByKind.image,
        ownerId: options.taskId,
      })
      normalizedImageUrls.push(persisted.url)
      continue
    }

    const normalized = normalizeExistingDriveUrl(url)
    if (normalized) {
      normalizedImageUrls.push(normalized)
    }
  }

  const nextAttachmentUrls = [...new Set(normalizedAttachmentUrls)]
  const nextImageUrls = [...new Set(normalizedImageUrls)]
  const attachmentUrl = nextAttachmentUrls[0]
  const imageUrl = nextImageUrls[0]

  return {
    attachmentUrl,
    attachmentUrls: nextAttachmentUrls,
    imageUrl,
    imageUrls: nextImageUrls,
    attachmentName,
  }
}
