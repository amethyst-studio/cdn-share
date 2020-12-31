import { createReadStream, readFileSync } from 'fs'
import { readFile, stat } from 'fs/promises'
import { lookup } from 'mime-types'
import { extname, resolve } from 'path'
import { Next, plugins, Request, Response } from 'restify'
import { NotFoundError } from 'restify-errors'
import { CDNServer } from '../../../../'
import { GenericRoute } from '../../route'

const template = readFileSync(resolve(__dirname, '../../../render/highlighter.html'))

export class Route extends GenericRoute {
  constructor (server: CDNServer) {
    super(server)

    this.configure({
      path: '/-/:namespace_id/:content_id',
      allow: 'get',
      middleware: [
        plugins.throttle({
          burst: 4,
          rate: 8.0,
          xff: true,
          maxKeys: 65535
        })
      ],
      contributors: {
        maintainer: {
          name: 'Samuel J Voeller',
          email: 'samuel.voeller@amethyst.live',
          previous: []
        }
      }
    })
  }

  async handle (request: Request, response: Response, next: Next): Promise<void> {
    const { namespace_id: namespaceId, content_id: contentId } = request.params

    if (namespaceId === undefined || !await this.server.namespaces.has(namespaceId)) {
      return next(new NotFoundError('The requested content was not found on the server.'))
    }

    if (contentId === undefined || !await this.server.namespaces.has(namespaceId)) {
      return next(new NotFoundError('The requested content was not found on the server.'))
    }

    // Get Index
    const index = await this.server.index.get(`${namespaceId as string}/${contentId as string}`)
    if (index === undefined) {
      return next(new NotFoundError('The requested content was not found on the server.'))
    }

    // Stat Disk for Existence
    const st = await stat(index.file as string).catch(() => { return null })
    if (st === null) {
      return next(new NotFoundError('The requested content was not found on the server.'))
    }

    switch (index.type?.toLowerCase() as string) {
      case 'text': {
        const page = template.toString().replace('%FILE%', await (await readFile(index.file as string)).toString())
        await response.writeHead(200, {
          'Content-Length': page.length,
          'Content-Type': 'text/html'
        })
        await response.write(page)
        return await response.end()
      }
      case 'image': {
        const type = lookup(extname(index.upload.name))
        await response.writeHead(200, {
          'Content-Length': index.upload.size,
          'Content-Type': type as string
        })
        await response.write(await readFile(index.file as string))
        return await response.end()
      }
      case 'binary':
      default: {
        const type = lookup(extname(index.upload.name))
        const stream = createReadStream(index.file as string)
        await response.writeHead(200, {
          'Content-Length': index.upload.size,
          'Content-Type': (type === undefined || index.type?.toLowerCase() === 'binary' ? 'application/octet-stream' : type as string)
        })
        const throttle = this.server.responseThrottler.createBandwidthThrottle(index.upload.size)
        request.once('aborted', () => {
          return throttle.abort()
        })
        await stream.pipe(throttle)
          .on('data', (chunk) => {
            return response.write(chunk)
          })
          .on('end', () => {
            return response.end()
          })
      }
    }
  }
}
