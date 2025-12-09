import { VRef } from '../root/V.js'
import { operationFactoryKey, operationNameKey, operationName, operationResultType, operationResultTypeKey, Errors } from '../types.js'

export const edgeOutV = {
  [operationNameKey]: operationName.outV,
  [operationResultTypeKey]: operationResultType.vertex,
  [operationFactoryKey]({ parent, ctx = {} } = {}) {
    const { kvStore: store, diagnostics } = ctx;
    const edgeId = parent == null ? null : String(parent)
    if (!edgeId) return VRef(null)

    return {
      [Symbol.asyncIterator]: (async function* () {
        let fromId = null
        try {
          fromId = await store.get(`edge.${edgeId}.incoming`).then((d) => d.string())
        } catch {
          fromId = null
        }
        if (fromId != null) yield fromId
      })
    }
  }
}
