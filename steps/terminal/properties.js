import {
  operationResultTypeKey,
  operationFactoryKey,
  operationResultType,
  operationNameKey,
  operationName,
  operationStreamWrapperKey
} from '../types.js'

async function readProperties(elementId, kvStore, keys, prefix, resolvers) {
  if (!Array.isArray(keys) || keys.length === 0) {
    return {}
  }

  const requested = keys.map(String)
  const entries = await Promise.all(requested.map(async (key) => {
    const resolver = resolvers[key]
    if (resolver) {
      try {
        return [key, await resolver({ elementId, kvStore })]
      } catch {
        return [key, undefined]
      }
    }

    try {
      const data = await kvStore.get(`${prefix}.${elementId}.property.${key}`)
      const value = await data.json()
      return [key, value]
    } catch {
      return [key, undefined]
    }
  }))

  return Object.fromEntries(entries)
}

function createPropertiesStep({ prefix, resolvers }) {
  return {
    [operationNameKey]: operationName.properties,
    [operationResultTypeKey]: operationResultType.value,
    [operationStreamWrapperKey]({ ctx: { kvStore } = {}, args = [] } = {}) {
      return (source) => (async function* () {
        for await (const elementId of source) {
          yield await readProperties(elementId, kvStore, args, prefix, resolvers)
        }
      })()
    },
    [operationFactoryKey]({ parent, ctx: { kvStore } = {}, args = [] } = {}) {
      async function* iterator() {
        yield await readProperties(parent, kvStore, args, prefix, resolvers)
      }

      return {
        [Symbol.asyncIterator]: iterator
      }
    }
  }
}

const vertexResolvers = {
  id: async ({ elementId }) => elementId,
  label: async ({ elementId, kvStore }) => {
    const data = await kvStore.get(`node.${elementId}.label`)
    return data.string()
  }
}

const edgeResolvers = {
  id: async ({ elementId }) => elementId,
  label: async ({ elementId, kvStore }) => {
    const data = await kvStore.get(`edge.${elementId}.label`)
    return data.string()
  }
}

export const vertexProperties = createPropertiesStep({
  prefix: 'node',
  resolvers: vertexResolvers
})

export const edgeProperties = createPropertiesStep({
  prefix: 'edge',
  resolvers: edgeResolvers
})
