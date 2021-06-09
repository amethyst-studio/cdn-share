import { rm } from 'fs/promises'
import type { MySQLAdapter } from 'k-value'
import { DateTime } from 'luxon'
import { Logging } from '../..'

export async function runExpire (indexTable: MySQLAdapter): Promise<void> {
  const keys = await indexTable.keys()
  for (const key of keys) {
    const index = await indexTable.get(key) as { expire: string | null; file: string; }
    if (index.expire === null) continue
    const expires = DateTime.fromISO(index.expire)
    const diff = expires.diff(DateTime.local().toUTC(), ['millisecond'])

    if (diff.milliseconds < 0) {
      Logging.GetLogger().warn(`EXPIRE (${key}) [${index.file}]`)
      await rm(index.file, {
        recursive: true,
        force: true
      }).catch(() => { /** */ })
      await indexTable.delete(key)
    }
  }
}
