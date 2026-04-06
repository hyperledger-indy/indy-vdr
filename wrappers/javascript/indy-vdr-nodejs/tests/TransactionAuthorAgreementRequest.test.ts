import type { IndyVdrPool } from '@hyperledger/indy-vdr-nodejs'
import { TransactionAuthorAgreementRequest } from '@hyperledger/indy-vdr-nodejs'
import { beforeAll, describe, expect, test } from 'vitest'
import { DID, setupPool } from './utils'

describe('TransactionAuthorAgreementRequest', () => {
  let pool: IndyVdrPool

  beforeAll(() => {
    pool = setupPool()
  })

  test('Submit request', async () => {
    const request = new TransactionAuthorAgreementRequest({
      submitterDid: DID,
      version: 'TODO',
    })

    await expect(pool.submitRequest(request)).rejects.toThrowError('MissingSignature()')
  })
})
