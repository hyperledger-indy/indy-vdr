import { uint8ArrayToByteBufferStruct } from './conversion'
import type { ByteBufferType } from './structures'

type Argument = Record<string, unknown> | Array<unknown> | Date | Uint8Array | SerializedArgument

type SerializedArgument = string | number | null | ByteBufferType

type SerializedArguments = Record<string, SerializedArgument>

export type SerializedOptions<Type> = Required<{
  [Property in keyof Type]: Type[Property] extends string
    ? string
    : Type[Property] extends number
      ? number
      : Type[Property] extends Record<string, unknown>
        ? string
        : Type[Property] extends string | Record<string, unknown>
          ? string
          : Type[Property] extends Array<unknown>
            ? string
            : Type[Property] extends Array<unknown> | undefined
              ? string
              : Type[Property] extends Record<string, unknown> | undefined
                ? string
                : Type[Property] extends Date
                  ? number
                  : Type[Property] extends Date | undefined
                    ? number
                    : Type[Property] extends string | undefined
                      ? string
                      : Type[Property] extends number | undefined
                        ? number
                        : Type[Property] extends Uint8Array
                          ? ByteBufferType
                          : unknown
}>

const serialize = (arg: Argument): SerializedArgument => {
  switch (typeof arg) {
    case 'undefined':
      return null
    case 'string':
      return arg
    case 'number':
      return arg
    case 'function':
      return arg
    case 'object':
      if (arg instanceof Date) {
        return arg.valueOf()
      }
      if (arg instanceof Uint8Array) {
        return uint8ArrayToByteBufferStruct(arg)
      }
      return JSON.stringify(arg)
    default:
      throw new Error('could not serialize value')
  }
}

const serializeArguments = <T extends Record<string, Argument> = Record<string, Argument>>(
  args: T
): SerializedOptions<T> => {
  const retVal: SerializedArguments = {}
  for (const [key, val] of Object.entries(args)) {
    retVal[key] = serialize(val)
  }
  return retVal as SerializedOptions<T>
}

export { serializeArguments }
