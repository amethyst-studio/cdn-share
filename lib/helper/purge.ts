import { stat } from 'fs/promises'
import { MySQLAdapter } from 'k-value'
import { Logging } from '../..'

export async function runIndexPurge (indexTable: MySQLAdapter): Promise<void> {
  const keys = await indexTable.keys()
  for (const key of keys) {
    const index = await indexTable.get(key)

    if (await stat(index.file).catch(() => { return null }) === null) {
      Logging.GetLogger().warn(
        `MISSING_FILE_FOR(${key})`,
        `${index.file as string}`,
        'The requested file was missing or corrupted, and the referenced index has been removed.'
      )
      await indexTable.delete(key)
    }
  }
}
