import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import koffi from 'koffi'
import { nativeBindings } from './bindings'
import type { NativeMethods } from './NativeBindings'

const LIBNAME = 'indy_vdr'
const ENV_VAR = 'LIB_INDY_VDR_PATH'

type Platform = 'darwin' | 'linux' | 'win32'

type ExtensionMap = Record<Platform, { prefix?: string; extension: string }>

const extensions: ExtensionMap = {
  darwin: { prefix: 'lib', extension: '.dylib' },
  linux: { prefix: 'lib', extension: '.so' },
  win32: { extension: '.dll' },
}

const libPaths: Record<Platform, string[]> = {
  darwin: ['/usr/local/lib/', '/usr/lib/', '/opt/homebrew/opt/'],
  linux: ['/usr/lib/', '/usr/local/lib/'],
  win32: ['c:\\windows\\system32\\'],
}

const doesPathExist = fs.existsSync

const getLibrary = () => {
  const platform = os.platform()

  if (platform !== 'linux' && platform !== 'win32' && platform !== 'darwin')
    throw new Error(`Unsupported platform: ${platform}. linux, win32 and darwin are supported.`)

  const pathFromEnvironment = process.env[ENV_VAR]

  const platformPaths = libPaths[platform]

  platformPaths.unshift(path.join(__dirname, '../../native'))

  if (pathFromEnvironment) platformPaths.unshift(pathFromEnvironment)

  const libraries = platformPaths.map((p) =>
    path.join(p, `${extensions[platform].prefix ?? ''}${LIBNAME}${extensions[platform].extension}`)
  )

  if (!libraries.some((libraryPath) => doesPathExist(libraryPath)))
    throw new Error(`Could not find ${LIBNAME} with these paths: ${libraries.join(' ')}`)

  const validLibraryPath = libraries.find((l) => doesPathExist(l)) as string

  const lib = koffi.load(validLibraryPath)

  const methods: Partial<NativeMethods> = {}
  for (const [name, [returnType, argumentTypes]] of Object.entries(nativeBindings)) {
    methods[name as keyof NativeMethods] = lib.func(name, returnType, argumentTypes)
  }

  return methods as NativeMethods
}

let nativeIndyVdr: NativeMethods | undefined
export const getNativeIndyVdr = () => {
  if (!nativeIndyVdr) nativeIndyVdr = getLibrary()
  return nativeIndyVdr
}
