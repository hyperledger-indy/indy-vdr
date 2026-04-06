import type { IndyVdrPool } from '@hyperledger/indy-vdr-nodejs'
import { SchemaRequest } from '@hyperledger/indy-vdr-nodejs'
import { beforeAll, describe, expect, test } from 'vitest'
import { DID, SCHEMA_ID, setupPool } from './utils'

describe('SchemaRequest', () => {
  let pool: IndyVdrPool

  beforeAll(() => {
    pool = setupPool()
  })

  test('Submit request', async () => {
    const request = new SchemaRequest({
      submitterDid: DID,
      schema: { attrNames: ['TODO'], id: SCHEMA_ID, name: 'foo', ver: '1.0', version: '1.0', seqNo: 1 },
    })

    await expect(pool.submitRequest(request)).rejects.toThrowError('MissingSignature()')
  })
})
