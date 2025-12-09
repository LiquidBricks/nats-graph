import { VRef } from '../root/V.js'
import { operationFactoryKey, operationNameKey, operationName, operationResultType, operationResultTypeKey, Errors } from '../types.js'

export const edgeInV = {
  [operationNameKey]: operationName.inV,
  [operationResultTypeKey]: operationResultType.vertex,
  [operationFactoryKey]({ parent, ctx = {} } = {}) {
    const { kvStore: store, diagnostics } = ctx;
    const edgeId = parent == null ? null : String(parent)
    if (!edgeId) return VRef(null)

    return {
      [Symbol.asyncIterator]: (async function* () {
        let toId = null
        try {
          toId = await store.get(`edge.${edgeId}.outgoing`).then((d) => d.string())
        } catch {
          toId = null
        }
        if (toId != null) yield toId
      })
    }
  }
}
