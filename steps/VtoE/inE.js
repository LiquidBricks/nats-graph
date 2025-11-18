import { operationFactoryKey, operationNameKey, operationName, operationResultType, operationResultTypeKey, Errors } from '../types.js'

const normalizeLabels = (args) => {
  if (!Array.isArray(args)) return []
  return args
    .filter((label) => label != null && label !== '')
    .map((label) => String(label))
}

const collectEdgeIds = async ({ store, vertexId, labels = [], dedupe }) => {
  const ids = new Set()
  const patterns = labels.length > 0
    ? labels.map((label) => `node.${vertexId}.inE.${label}.>`)
    : [`node.${vertexId}.inE.>`]

  for (const pattern of patterns) {
    const keys = await store.keys(pattern).catch(() => [])
    for await (const key of keys) {
      const edgeId = key.split('.').pop()
      if (!edgeId || edgeId === '__index') continue
      if (dedupe?.has(edgeId)) continue
      ids.add(edgeId)
      dedupe?.add(edgeId)
    }
  }

  return ids
}

export const inE = {
  [operationNameKey]: operationName.inE,
  [operationResultTypeKey]: operationResultType.edge,
  [operationFactoryKey]({ parent, ctx = {}, args = [] } = {}) {
    const { kvStore: store, diagnostics } = ctx;
    const vertexId = parent == null ? null : String(parent)
    if (!vertexId) {
      async function* empty() { }
      return { [Symbol.asyncIterator]: empty }
    }

    const wanted = new Set(normalizeLabels(args))

    return {
      [Symbol.asyncIterator]: (async function* () {
        const ids = await collectEdgeIds({
          store,
          vertexId,
          labels: Array.from(wanted)
        })

        for (const id of ids) {
          if (id != null) yield id
        }
      })
    }
  }
}
