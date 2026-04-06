import type { GetValidatorInfoResponse, IndyVdrPool } from '@hyperledger/indy-vdr-nodejs'
import { GetValidatorInfoAction } from '@hyperledger/indy-vdr-nodejs'
import { beforeAll, describe, expect, test } from 'vitest'
import { DID, setupPool } from './utils'

describe('GetValidatorInfoAction', () => {
  let pool: IndyVdrPool

  beforeAll(() => {
    pool = setupPool()
  })

  test('Submit action', async () => {
    const action = new GetValidatorInfoAction({ submitterDid: DID })
    const response: GetValidatorInfoResponse = await pool.submitAction(action)

    expect(response).toMatchObject({})
  })
})
