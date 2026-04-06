import type { IndyVdrPool } from '@hyperledger/indy-vdr-nodejs'
import { DisableAllTransactionAuthorAgreementsRequest } from '@hyperledger/indy-vdr-nodejs'
import { beforeAll, describe, expect, test } from 'vitest'
import { DID, setupPool } from './utils'

describe('DisableAllTransactionsAuthorAgreementRequest', () => {
  let pool: IndyVdrPool

  beforeAll(() => {
    pool = setupPool()
  })

  test('Submit request', async () => {
    const request = new DisableAllTransactionAuthorAgreementsRequest({ submitterDid: DID })

    await expect(pool.submitRequest(request)).rejects.toThrowError('MissingSignature()')
  })
})
