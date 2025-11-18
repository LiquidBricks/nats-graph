import { operationChainExecutor } from '../../graph/operationChain.js'

export const hasResults = async (candidate) => {
  let value = candidate
  if (typeof value?.then === 'function') value = await value

  if (value?.[Symbol.asyncIterator]) {
    for await (const _ of value) return true
    return false
  }

  if (value?.[Symbol.iterator]) {
    for (const _ of value) return true
    return false
  }

  return Boolean(value)
}

export const buildTraversal = ({ startProp, seed }) => {
  const operationsChain = [{ prop: startProp, args: [seed] }]
  const traversal = new Proxy({}, {
    get(_target, prop) {
      if (prop === 'then') return undefined
      if (prop === Symbol.toStringTag) return 'TraversalBuilder'
      return (...args) => {
        operationsChain.push({ prop, args })
        return traversal
      }
    }
  })

  return { operationsChain, traversal }
}

export const hasTraversalResults = async ({ operationsChain, ctx }) => {
  const traversal = operationChainExecutor({ operationsChain, kvStore: ctx.kvStore, diagnostics: ctx.diagnostics })
  for await (const _ of traversal) return true
  return false
}

export const evaluatePredicate = async ({ predicate, item, startProp, ctx = {} }) => {
  if (!startProp) return hasResults(predicate(item))

  const { operationsChain, traversal } = buildTraversal({ startProp, seed: item })
  const predicateResult = predicate(traversal)
  if (predicateResult !== traversal && predicateResult !== undefined) {
    return hasResults(predicateResult)
  }

  return hasTraversalResults({ operationsChain, ctx })
}
