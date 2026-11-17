const encoder = new TextEncoder()

interface ZipFile {
  path: string
  content: Uint8Array
}

export function createZipArchive(files: ZipFile[]) {
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  let offset = 0

  for (const file of files) {
    const name = encoder.encode(file.path)
    const checksum = crc32(file.content)
    const localHeader = new Uint8Array(30 + name.length)
    const localView = new DataView(localHeader.buffer)
    localView.setUint32(0, 0x04034b50, true)
    localView.setUint16(4, 20, true)
    localView.setUint16(6, 0x0800, true)
    localView.setUint16(8, 0, true)
    localView.setUint32(14, checksum, true)
    localView.setUint32(18, file.content.length, true)
    localView.setUint32(22, file.content.length, true)
    localView.setUint16(26, name.length, true)
    localHeader.set(name, 30)
    localParts.push(localHeader, file.content)

    const centralHeader = new Uint8Array(46 + name.length)
    const centralView = new DataView(centralHeader.buffer)
    centralView.setUint32(0, 0x02014b50, true)
    centralView.setUint16(4, 20, true)
    centralView.setUint16(6, 20, true)
    centralView.setUint16(8, 0x0800, true)
    centralView.setUint16(10, 0, true)
    centralView.setUint32(16, checksum, true)
    centralView.setUint32(20, file.content.length, true)
    centralView.setUint32(24, file.content.length, true)
    centralView.setUint16(28, name.length, true)
    centralView.setUint32(42, offset, true)
    centralHeader.set(name, 46)
    centralParts.push(centralHeader)
    offset += localHeader.length + file.content.length
  }

  const centralDirectory = concatenate(centralParts)
  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  endView.setUint32(0, 0x06054b50, true)
  endView.setUint16(8, files.length, true)
  endView.setUint16(10, files.length, true)
  endView.setUint32(12, centralDirectory.length, true)
  endView.setUint32(16, offset, true)
  const archive = concatenate([...localParts, centralDirectory, end])
  const archiveBuffer = archive.buffer.slice(archive.byteOffset, archive.byteOffset + archive.byteLength) as ArrayBuffer
  return new Blob([archiveBuffer], { type: 'application/zip' })
}

function concatenate(parts: Uint8Array[]) {
  const result = new Uint8Array(parts.reduce((length, part) => length + part.length, 0))
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}

function crc32(bytes: Uint8Array) {
  let checksum = 0xffffffff
  for (const byte of bytes) {
    checksum ^= byte
    for (let bit = 0; bit < 8; bit += 1) checksum = (checksum >>> 1) ^ (-(checksum & 1) & 0xedb88320)
  }
  return (checksum ^ 0xffffffff) >>> 0
}
