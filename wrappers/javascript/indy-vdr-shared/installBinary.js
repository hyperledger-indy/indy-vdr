const path = require('path')
const tar = require('tar')
const fs = require('fs')

async function downloadBinaryIfNeeded({ packageName, version, host, targetDirectory }) {
  if (!needsDownload({ version, targetDirectory })) return

  await downloadBinary({ packageName, version, host, targetDirectory })
}

function needsDownload({ version, targetDirectory }) {
  const metadataPath = path.join(targetDirectory, 'version.json')

  if (!fs.existsSync(metadataPath)) return true

  // Check if metadata exists and matches current version
  try {
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'))
    if (metadata.version === version) {
      console.log('Binary is up to date, skipping download')
      return false
    }
  } catch (_error) {
    // If metadata is corrupted, download anyway
    console.log('Metadata file is invalid, will download binary')
  }

  return true
}

async function downloadBinary({ packageName, version, host, targetDirectory }) {
  const url = `${host}/${version}/${packageName}`
  const metadataPath = path.join(targetDirectory, 'version.json')

  console.log(`Downloading binary from ${url} to \n ${targetDirectory}...`)

  try {
    // Ensure the directory exists
    if (!fs.existsSync(targetDirectory)) {
      fs.mkdirSync(targetDirectory, { recursive: true })
    }

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to download: ${response.status} ${response.statusText}`)
    }
    const data = await response.arrayBuffer()

    // Write the downloaded file first
    const tempFile = path.join(targetDirectory, 'indy_vdr.tar.gz')
    fs.writeFileSync(tempFile, Buffer.from(data))

    // Then extract it
    return tar
      .extract({
        file: tempFile,
        cwd: targetDirectory,
        strip: 1,
      })
      .then(() => {
        // Remove the tarball after extraction
        fs.unlinkSync(tempFile)

        // Save version metadata
        fs.writeFileSync(
          metadataPath,
          JSON.stringify({
            version,
          })
        )

        console.log('Binary downloaded and extracted successfully')
      })
  } catch (error) {
    console.error('Error downloading binary:', error)
    process.exit(1)
  }
}

module.exports = {
  downloadBinaryIfNeeded,
}
