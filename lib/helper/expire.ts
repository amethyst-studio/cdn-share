import { rm } from 'fs/promises'
import { MySQLAdapter } from 'k-value'
import { DateTime } from 'luxon'

export async function runExpire (indexTable: MySQLAdapter): Promise<void> {
  const keys = await indexTable.keys()
  for (const key of keys) {
    const index = await indexTable.get(key)
    if (index.expire === null) continue
    const expires = DateTime.fromISO(index.expire)
    const diff = expires.diff(DateTime.local().toUTC(), ['millisecond'])

    if (diff.milliseconds !== undefined && diff.milliseconds < 0) {
      console.warn(
        `EXPIRATION_FOR(${key}) [${index.file as string}]`,
        'The indexed file has been expired and is pending removal.'
      )
      await rm(index.file, {
        recursive: true,
        force: true
      }).catch(() => {})
      await indexTable.delete(key)
    }
  }
}
