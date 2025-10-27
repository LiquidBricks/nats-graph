import assert from 'node:assert/strict'
import test, { suite, after } from 'node:test'

import { addV } from '../../../steps/root/addV.js'
import { _vHasLabel } from '../../../steps/optimized/_vHasLabel.js'
import { operationFactoryKey } from '../../../steps/types.js'
import { kvProvider } from '../../../kvProvider/memory/provider.js'
import { diagnostics } from '../../../diagnosticsProvider/index.js'

const closers = []
async function setupKV() {
  const kvp = await kvProvider({ ctx: { diagnostics: diagnostics() } })
  closers.push(() => kvp.close?.())
  return kvp.interface
}
after(async () => { for (const c of closers) await c?.() })

const diags = () => diagnostics()

suite('_vHasLabel optimized step', () => {
  test('type/laziness: returns async-iterable; does not call kvStore.keys until consumed', async () => {
    const kvStore = await setupKV()
    let keysCalls = 0
    const origKeys = kvStore.keys.bind(kvStore)
    kvStore.keys = async (pattern) => { keysCalls += 1; return origKeys(pattern) }

    const itr = _vHasLabel[operationFactoryKey]({ ctx: { kvStore }, args: ['component'] })
    assert.equal(typeof itr?.[Symbol.asyncIterator], 'function')
    assert.equal(keysCalls, 0)

    const out = await Array.fromAsync(itr)
    assert.deepEqual(out, [])
    assert.equal(keysCalls > 0, true)
  })

  test('filters by label: yields ids of vertices with the given label (order-agnostic)', async () => {
    const kvStore = await setupKV()
    const created = { component: [], service: [] }
    for (const lbl of ['component', 'service', 'component', 'service']) {
      const [id] = await Array.fromAsync(addV[operationFactoryKey]({ ctx: { kvStore, diagnostics: diags() }, args: [lbl] }))
      created[lbl].push(id)
    }

    const out = await Array.fromAsync(_vHasLabel[operationFactoryKey]({ ctx: { kvStore }, args: ['component'] }))
    assert.deepEqual(new Set(out), new Set(created.component))
  })

  test('non-existent label yields empty result', async () => {
    const kvStore = await setupKV()
    // Seed only one label
    for (const lbl of ['service', 'service']) {
      await Array.fromAsync(addV[operationFactoryKey]({ ctx: { kvStore, diagnostics: diags() }, args: [lbl] }))
    }
    const out = await Array.fromAsync(_vHasLabel[operationFactoryKey]({ ctx: { kvStore }, args: ['component'] }))
    assert.deepEqual(out, [])
  })
})

