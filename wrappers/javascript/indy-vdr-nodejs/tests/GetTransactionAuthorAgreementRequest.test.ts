import type { GetTransactionAuthorAgreementResponse, IndyVdrPool } from '@hyperledger/indy-vdr-nodejs'
import { GetTransactionAuthorAgreementRequest } from '@hyperledger/indy-vdr-nodejs'
import { beforeAll, describe, expect, test } from 'vitest'
import { setupPool } from './utils'

describe('GetTransactionAuthorAgreementRequest', () => {
  let pool: IndyVdrPool

  beforeAll(() => {
    pool = setupPool()
  })

  test('Submit request', async () => {
    const request = new GetTransactionAuthorAgreementRequest({})
    const response: GetTransactionAuthorAgreementResponse = await pool.submitRequest(request)

    expect(response).toMatchObject({
      op: 'REPLY',
    })
  })
})
