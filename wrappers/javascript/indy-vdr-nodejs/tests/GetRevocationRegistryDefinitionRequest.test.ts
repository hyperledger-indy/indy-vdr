import type { GetRevocationRegistryDefinitionResponse, IndyVdrPool } from '@hyperledger/indy-vdr-nodejs'
import { GetRevocationRegistryDefinitionRequest } from '@hyperledger/indy-vdr-nodejs'
import { beforeAll, describe, expect, test } from 'vitest'
import { REVOC_REG_DEF_ID, setupPool } from './utils'

describe('GetRevocationRegistryDefinitionRequest', () => {
  let pool: IndyVdrPool

  beforeAll(() => {
    pool = setupPool()
  })

  test('Submit request', async () => {
    const request = new GetRevocationRegistryDefinitionRequest({ revocationRegistryId: REVOC_REG_DEF_ID })
    const response: GetRevocationRegistryDefinitionResponse = await pool.submitRequest(request)

    expect(response).toMatchObject({
      op: 'REPLY',
    })
  })
})
