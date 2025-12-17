export const keyExists = async (kvStore, keyOrPattern) => {
  const itr = await kvStore.keys(keyOrPattern)
  const { done, value } = await itr[Symbol.asyncIterator]().next()
  return !done && value !== undefined
}

export const getStringOrNull = async (kvStore, key) => {
  try {
    return await kvStore.get(key).then((d) => d.string())
  } catch {
    return null
  }
}

export const getJsonArrayOrEmpty = async (kvStore, key) => {
  const raw = await kvStore.get(key).then((d) => d.string()).catch(() => '[]')
  try {
    const value = JSON.parse(raw || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

export const removeFromJsonArray = async (kvStore, key, value) => {
  const next = (await getJsonArrayOrEmpty(kvStore, key)).filter(
    (entry) => String(entry) !== String(value),
  )
  await kvStore.update(key, JSON.stringify(next)).catch(() => { })
}

export const pushUniqueToJsonArray = async (kvStore, key, value) => {
  const items = await getJsonArrayOrEmpty(kvStore, key)
  if (!items.includes(value)) {
    items.push(value)
    await kvStore.update(key, JSON.stringify(items)).catch(() => { })
  }
}

