import { Errors } from '../steps/types.js'
import { kvProviderFactory } from '../kvProvider/factory.js'
import { diagnostics as createDiagnostics } from '@liquid-bricks/shared-providers/diagnostics'
import buildMeta from '../build-meta.js'
import { operationChainExecutor } from './operationChain.js'

export const Graph = (config) => {

  const packageContext = {
    package: buildMeta.package ?? 'nats-graph',
    version: buildMeta.version ?? buildMeta.commit ?? 'unknown',
  }
  config ||= {}
  const { kv, kvConfig } = config
  const baseDiagnostics = config.diagnostics ?? createDiagnostics()
  const diagnostics = baseDiagnostics.child({ [buildMeta.packageHash]: packageContext })
  let kvStore = kvProviderFactory(kv)
  const getKVStore = async () => {
    if (typeof kvStore === 'function') {
      kvStore = kvStore({
        config: kvConfig,
        ctx: { diagnostics }
      })
    }
    return kvStore
  }


  return graph({ getKVStore, diagnostics });
}

const graph = ({ getKVStore, diagnostics }) => ({
  get g() {
    return (function createProxy(operationsChain = []) {
      const handler = {
        get(_, prop) {
          if (prop === 'explain') {
            return () => operationsChain
              .map(({ prop, args }) => `${prop}(${args.map(a => JSON.stringify(a)).join(', ')})`)
              .join(' -> ');
          }
          if (prop === 'then') {
            return (onFulfilled) => onFulfilled(Array.fromAsync((async function* () {
              const { interface: kvStore } = await getKVStore()
              diagnostics.require(!!kvStore, Errors.KVSTORE_MISSING, 'kvStore does not have an interface.', { where: 'graph.then' })
              yield* operationChainExecutor({
                operationsChain,
                kvStore,
                diagnostics,
              })
            })()))
          }
          return (...args) => createProxy([...operationsChain, { prop, args }])
        }
      }
      return new Proxy({}, handler)
    })()
  },
  async close() {
    const kvStore = await getKVStore()
    await kvStore.close()
  }
})
