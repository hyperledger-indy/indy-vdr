import type { ByteBufferType } from './structures'

export const uint8ArrayToByteBufferStruct = (buffer: Uint8Array = new Uint8Array(0)): ByteBufferType => {
  return { data: buffer, len: buffer.length }
}
