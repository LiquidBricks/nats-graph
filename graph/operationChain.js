import { createHash } from 'node:crypto'
import { ulid } from 'ulid'
import buildMeta from '../build-meta.js'
import { operationFactoryKey, operationStreamWrapperKey } from '../steps/types.js'
import { optimizeOpsChain } from './optimizer.js'

const hashOperationsChain = (operationsChain) => createHash('sha1')
  .update(JSON.stringify(operationsChain.map(({ prop, args }) => ({ prop, args }))))
  .digest('hex')

export async function* operationChainExecutor({ operationsChain, kvStore, diagnostics }) {
  const optimizedChain = optimizeOpsChain(operationsChain, { diagnostics })
  const chainHash = hashOperationsChain(optimizedChain)
  let pipeline = seedPipeline()
  const queryId = ulid()
  const queryMetaKey = `${buildMeta.packageHash}-query`
  const stepMetaKey = `${buildMeta.packageHash}-step`
  const queryMeta = {
    id: queryId,
    hash: chainHash,
    query: optimizedChain.map(({ prop, args }) => ({ prop, args }))
  }
  const chainDiagnostics = diagnostics.child({ [queryMetaKey]: queryMeta })

  for (const [index, step] of optimizedChain.entries()) {
    const { prop, args } = step
    const stepDiagnostics = chainDiagnostics.child({
      [stepMetaKey]: { prop, args, index, hash: chainHash, queryId }
    })
    pipeline = attachStep({ pipeline, step, ctx: { kvStore, diagnostics: stepDiagnostics } })
  }

  for await (const result of pipeline) {
    yield result
  }
}

export function seedPipeline() {
  return (async function* () {
    yield null
  })()
}

export function attachStep({ pipeline, step, ctx }) {
  const { args, operation } = step
  const stepCtx = { kvStore: ctx?.kvStore, diagnostics: ctx?.diagnostics }

  const streamWrap = operation[operationStreamWrapperKey]
  if (typeof streamWrap === 'function') {
    return streamWrap({ ctx: stepCtx, args })(pipeline)
  }

  const stepFactory = operation[operationFactoryKey]

  return (async function* () {
    for await (const parent of pipeline) {
      const itemIter = stepFactory({
        parent,
        ctx: stepCtx,
        args
      })

      for await (const item of itemIter) {
        yield item
      }
    }
  })()
}
