import "server-only"

import type { PageFeatureKey, PageFeatureStateMap } from "@/lib/page-features"
import { getDefaultPageFeatureStateMap } from "@/lib/page-features"
import {
  getDbPageFeatures,
  setDbPageFeatures,
  type PageFeatureSetting,
} from "@/lib/server/persistent-store"
import {
  getAllDbPageFeatures,
  toPageFeatureStateMap,
  upsertDbPageFeature,
} from "@/lib/server/google-sheets-page-features"

const PAGE_FEATURE_RECORDS_CACHE_TTL_MS = 60_000
const PAGE_FEATURE_SOURCE_TIMEOUT_MS = 1_200

let pageFeatureRecordsCache: { expiresAt: number; data: PageFeatureSetting[] } | null = null

function mergePageFeatureRecords(records: PageFeatureSetting[]): PageFeatureSetting[] {
  const map = new Map<PageFeatureKey, PageFeatureSetting>()

  for (const record of records) {
    map.set(record.key, {
      key: record.key,
      enabled: Boolean(record.enabled),
      updatedAt: record.updatedAt,
      updatedBy: record.updatedBy,
    })
  }

  return [...map.values()].sort((left, right) => left.key.localeCompare(right.key))
}

async function readPageFeaturesFromSheetWithTimeout() {
  return await Promise.race([
    getAllDbPageFeatures(),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("timeout")), PAGE_FEATURE_SOURCE_TIMEOUT_MS)
    }),
  ])
}

export async function getEffectivePageFeatureRecords(): Promise<PageFeatureSetting[]> {
  if (pageFeatureRecordsCache && pageFeatureRecordsCache.expiresAt > Date.now()) {
    return pageFeatureRecordsCache.data
  }

  const fallbackRecords = mergePageFeatureRecords(getDbPageFeatures())

  try {
    const fromSheet = await readPageFeaturesFromSheetWithTimeout()
    const normalized = mergePageFeatureRecords(fromSheet)
    setDbPageFeatures(normalized)

    pageFeatureRecordsCache = {
      expiresAt: Date.now() + PAGE_FEATURE_RECORDS_CACHE_TTL_MS,
      data: normalized,
    }

    return normalized
  } catch {
    pageFeatureRecordsCache = {
      expiresAt: Date.now() + PAGE_FEATURE_RECORDS_CACHE_TTL_MS,
      data: fallbackRecords,
    }
    return fallbackRecords
  }
}

export async function getEffectivePageFeatureStateMap(): Promise<PageFeatureStateMap> {
  const defaults = getDefaultPageFeatureStateMap()
  const records = await getEffectivePageFeatureRecords()
  const fromRecords = toPageFeatureStateMap(records)

  return {
    ...defaults,
    ...fromRecords,
  }
}

export async function setPageFeatureState(input: {
  key: PageFeatureKey
  enabled: boolean
  updatedBy?: string
}) {
  const timestamp = new Date().toISOString()

  try {
    const updated = await upsertDbPageFeature(input)

    const nextRecords = mergePageFeatureRecords([
      ...getDbPageFeatures().filter((item) => item.key !== updated.key),
      {
        key: updated.key,
        enabled: updated.enabled,
        updatedAt: updated.updatedAt,
        updatedBy: updated.updatedBy,
      },
    ])

    setDbPageFeatures(nextRecords)
    pageFeatureRecordsCache = {
      expiresAt: Date.now() + PAGE_FEATURE_RECORDS_CACHE_TTL_MS,
      data: nextRecords,
    }

    return {
      key: updated.key,
      enabled: updated.enabled,
      updatedAt: updated.updatedAt,
      updatedBy: updated.updatedBy,
    }
  } catch {
    const fallbackRecord = {
      key: input.key,
      enabled: Boolean(input.enabled),
      updatedAt: timestamp,
      updatedBy: input.updatedBy,
    }

    const nextRecords = mergePageFeatureRecords([
      ...getDbPageFeatures().filter((item) => item.key !== fallbackRecord.key),
      fallbackRecord,
    ])

    setDbPageFeatures(nextRecords)
    pageFeatureRecordsCache = {
      expiresAt: Date.now() + PAGE_FEATURE_RECORDS_CACHE_TTL_MS,
      data: nextRecords,
    }

    return fallbackRecord
  }
}
