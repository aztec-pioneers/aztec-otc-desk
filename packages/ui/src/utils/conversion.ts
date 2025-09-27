import { Buffer } from 'buffer'

export const convertFromUTF8BufferAsString = (input: string | Buffer | Uint8Array) => {
  if (typeof input === 'string') {
    return input
  }
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input)
  return buffer.toString('utf8')
}

export const parseAliasedBuffersAsString = (
  entries: Iterable<[string, Buffer | Uint8Array]>,
): Array<{ alias: string; value: string }> => {
  const result: Array<{ alias: string; value: string }> = []
  for (const [alias, value] of entries) {
    const stringValue = convertFromUTF8BufferAsString(value)
    result.push({ alias, value: stringValue })
  }
  return result
}
