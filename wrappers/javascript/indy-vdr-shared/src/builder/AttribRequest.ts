import { IndyVdrRequest, indyVdr } from '../indyVdr'
import type { WriteRequestResponse, WriteRequestResultTxnBase } from '../types'

export type AttribRequestOptions = {
  submitterDid: string
  targetDid: string
  hash?: string
  raw?: string
  enc?: string
}

interface AttribResultTxn extends WriteRequestResultTxnBase {
  type: '100'
  data: {
    raw?: string
    enc?: string
    hash?: string
    dest: string
  }
}

export type AttribResponse = WriteRequestResponse<AttribResultTxn>

export class AttribRequest extends IndyVdrRequest<AttribResponse> {
  public constructor(options: AttribRequestOptions) {
    const handle = indyVdr.buildAttribRequest(options)
    super({ handle })
  }
}
