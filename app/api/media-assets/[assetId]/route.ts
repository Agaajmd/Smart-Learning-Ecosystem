import { getDbMediaAssetById } from "@/lib/server/google-sheets-media-assets"

export async function GET(_request: Request, context: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await context.params
  const normalizedAssetId = String(assetId || "").trim()
  if (!normalizedAssetId) {
    return new Response("assetId wajib diisi", { status: 400 })
  }

  const isLegacy = normalizedAssetId.startsWith("legacy-")
  const isDriveId = /^[a-zA-Z0-9_-]{10,}$/.test(normalizedAssetId)
  if (!isLegacy && !isDriveId) {
    return new Response("Format assetId tidak valid", { status: 400 })
  }

  const media = await getDbMediaAssetById(normalizedAssetId)

  if (!media) {
    return new Response("Media asset tidak ditemukan", { status: 404 })
  }

  const body = new Uint8Array(media.buffer)

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": media.mimeType,
      "Content-Length": String(media.buffer.length),
      "Cache-Control": "public, max-age=604800, stale-while-revalidate=86400",
      "Content-Disposition": `inline; filename="${media.fileName}"`,
    },
  })
}
