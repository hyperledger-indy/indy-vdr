import type { GetNymResponse, IndyVdrPool } from '@hyperledger/indy-vdr-nodejs'
import { GetNymRequest } from '@hyperledger/indy-vdr-nodejs'
import { beforeAll, describe, expect, test } from 'vitest'
import { DID, setupPool } from './utils'

describe('GetNymRequest', () => {
  let pool: IndyVdrPool

  beforeAll(() => {
    pool = setupPool()
  })

  test('Submit request', async () => {
    const request = new GetNymRequest({ dest: DID })
    const response: GetNymResponse = await pool.submitRequest(request)

    expect(response).toMatchObject({ op: 'REPLY' })
  })
})
