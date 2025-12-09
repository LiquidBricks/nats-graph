import { operationResultTypeKey, operationFactoryKey, operationResultType, operationNameKey, operationName, operationStreamWrapperKey } from '../types.js'

const keyExists = async (kvStore, key) => {
  const itr = await kvStore.keys(key)
  const { done, value } = await itr[Symbol.asyncIterator]().next()
  return !done && value !== undefined
}

export const E = {
  [operationNameKey]: operationName.E,
  [operationResultTypeKey]: operationResultType.edge,
  [operationStreamWrapperKey]({ ctx: { kvStore } = {}, args: [idOrIds] = [] } = {}) {
    return (source) => (async function* () {
      for await (const _ of source) {
        // drain upstream to preserve traverser metadata
      }
      if (Array.isArray(idOrIds)) {
        for (const edgeId of idOrIds) {
          const exists = await keyExists(kvStore, `edges.${edgeId}`)
          if (exists) yield edgeId
        }
        return
      }

      if (idOrIds === undefined || idOrIds === null) {
        const keys = await kvStore.keys('edges.*')
        for await (const key of keys) {
          yield key.split('.').pop()
        }
        return
      }

      if (kvStore) {
        const exists = await keyExists(kvStore, `edges.${idOrIds}`)
        if (exists) yield idOrIds
      }
    })()
  },
  [operationFactoryKey]({
    ctx: { kvStore } = {},
    args: [idOrIds] = [] } = {}
  ) {
    async function* iterator() {
      if (Array.isArray(idOrIds)) {
        for (const edgeId of idOrIds) {
          const exists = await keyExists(kvStore, `edges.${edgeId}`)
          if (exists) yield edgeId
        }
        return
      }

      if (idOrIds === undefined || idOrIds === null) {
        const keys = await kvStore.keys('edges.*')
        for await (const key of keys) {
          yield key.split('.').pop()
        }
        return
      }

      if (kvStore) {
        const exists = await keyExists(kvStore, `edges.${idOrIds}`)
        if (exists) yield idOrIds
      }
    }

    return {
      [Symbol.asyncIterator]: iterator,
    }
  }
}
