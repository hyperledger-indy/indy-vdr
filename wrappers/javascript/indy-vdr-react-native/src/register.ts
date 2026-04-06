import { NativeModules, Platform } from 'react-native'
import type { NativeBindings } from './NativeBindings'

declare global {
  const _indy_vdr: NativeBindings
}

export const register = (): NativeBindings => {
  const libraryName = 'indy-vdr'

  let doesIndyVdrExist = false
  try {
    doesIndyVdrExist = Boolean(_indy_vdr)
  } catch {
    doesIndyVdrExist = false
  }

  // Check if the constructor exists. If not, try installing the JSI bindings.
  if (!doesIndyVdrExist) {
    const indyVdrModule = NativeModules.IndyVdr as {
      install: () => boolean
    } | null

    if (indyVdrModule == null) {
      let message = `Failed to create a new ${libraryName}' instance: The native ${libraryName} Module could not be found.'
      message += '\n* Make sure is correctly autolinked.`

      if (Platform.OS === 'ios' || Platform.OS === 'macos') {
        message += '\n* Make sure you ran `pod install` in the ios/ directory.'
      }
      if (Platform.OS === 'android') {
        message += '\n* Make sure gradle is synced.'
      }
      // check if Expo
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const ExpoConstants =
        NativeModules.NativeUnimoduleProxy?.modulesConstants?.ExponentConstants ?? NativeModules.ExpoConstants
      if (ExpoConstants != null) {
        if (ExpoConstants.appOwnership === 'expo') {
          // We're running Expo Go
          message += `\n* In Expo Go, run 'expo install @hyperledger/indy-vdr-react-native'`
        } else {
          message += `\n* In Expo bare workflow, run 'expo install @hyperledger/indy-vdr-react-native' and rebuild with 'expo run:${Platform.OS}'`
        }
      }

      message += '\n* Rebuild the app'

      throw new Error(message)
    }

    // Call the synchronous blocking install() function
    const result = indyVdrModule.install()
    if (result !== true) {
      throw new Error(
        `Failed to install ${libraryName}: The native ${libraryName} Module could not be installed! Looks like something went wrong when installing JSI bindings: ${String(
          result
        )}`
      )
    }

    // Check again if the constructor now exists after calling install()
    doesIndyVdrExist = Boolean(_indy_vdr)
    if (!doesIndyVdrExist) {
      throw new Error(
        `Failed to install ${libraryName}, the native initializer function does not exist. Are you trying to use ${libraryName} from different JS contexts?`
      )
    }
  }

  return _indy_vdr
}
