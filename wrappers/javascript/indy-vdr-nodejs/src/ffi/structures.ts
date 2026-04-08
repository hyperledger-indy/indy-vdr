import koffi from 'koffi'
import { FFI_INT64, FFI_UINT8 } from './primitives'

export const ByteBufferStruct = koffi.struct('indyvdr_ByteBuffer', {
  len: FFI_INT64,
  data: koffi.pointer(FFI_UINT8),
})

export type ByteBufferType = {
  len: number
  data: Uint8Array
}
