import { IndyVdrRequest, indyVdr } from '../indyVdr'
import type { WriteRequestResponse, WriteRequestResultTxnBase } from '../types'

export type NymRequestOptions = {
  submitterDid: string
  dest: string
  verkey?: string
  alias?: string
  role?: 'STEWARD' | 'TRUSTEE' | 'ENDORSER' | 'NETWORK_MONITOR'
  diddocContent?: string
  version?: number
}

interface NymResultTxn extends WriteRequestResultTxnBase {
  type: '1'
  data: {
    dest: string
    verkey: string
    alias?: string
    role?: string
  }
}

export type NymResponse = WriteRequestResponse<NymResultTxn>

export class NymRequest extends IndyVdrRequest<NymResponse> {
  public constructor(options: NymRequestOptions) {
    const handle = indyVdr.buildNymRequest(options)
    super({ handle })
  }
}
