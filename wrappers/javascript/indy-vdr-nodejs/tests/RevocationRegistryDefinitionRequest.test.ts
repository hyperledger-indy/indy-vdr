import type { IndyVdrPool } from '@hyperledger/indy-vdr-nodejs'
import { RevocationRegistryDefinitionRequest } from '@hyperledger/indy-vdr-nodejs'
import { beforeAll, describe, expect, test } from 'vitest'
import { CRED_DEF_ID, DID, setupPool } from './utils'

describe('RevocationRegistryDefinitionRequest', () => {
  let pool: IndyVdrPool

  beforeAll(() => {
    pool = setupPool()
  })

  test('Submit request', async () => {
    const request = new RevocationRegistryDefinitionRequest({
      submitterDid: DID,
      revocationRegistryDefinitionV1: {
        ver: '1.0',
        credDefId: CRED_DEF_ID,
        id: 'TODO',
        revocDefType: 'CL_ACCUM',
        tag: 'TODO',
        value: {
          issuanceType: 'ISSUANCE_BY_DEFAULT',
          maxCredNum: 0,
          publicKeys: { accumKey: { z: 'TODO' } },
          tailsHash: 'TODO',
          tailsLocation: 'TODO',
        },
      },
    })

    await expect(pool.submitRequest(request)).rejects.toThrowError('MissingSignature()')
  })
})
