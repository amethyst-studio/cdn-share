import { mkdir, rm } from 'fs/promises'
import { resolve } from 'path'
import type { Next, Request, Response } from 'restify'
import { plugins } from 'restify'
import { NotFoundError } from 'restify-errors'
import type { CDNServer } from '../../../..'
import { AuthMiddleware } from '../../middleware/auth.verify'
import { GenericRoute } from '../../route'

export class Route extends GenericRoute {
  public constructor (server: CDNServer) {
    super(server)

    this.configure({
      path: '/v1/-/delete/:content_id',
      allow: 'del',
      middleware: [
        plugins.throttle({
          burst: 0,
          rate: 0.5,
          xff: true,
          maxKeys: 65535
        }),
        AuthMiddleware.email,
        AuthMiddleware.token
      ]
    })
  }

  public async handle (request: Request, response: Response, next: Next): Promise<void> {
    const { email, content_id: contentId } = request.params

    // Generate Namespace Directory
    const profile = await this.server.users.get(email)
    await mkdir(resolve(__dirname, `../../../../namespace/${profile.namespace as string}`), { recursive: true })

    // Fetch from Index
    const index = await this.server.index.get(`${profile.namespace as string}/${contentId as string}`)
    if (index === undefined) {
      next(new NotFoundError('The requested content was not found on the server.'))
      return
    }

    // Remove Content from Disk
    await rm(index.file, {
      recursive: true,
      force: true
    }).catch(() => { /** */ })

    // Remove Index from Database
    await this.server.index.delete(`${profile.namespace as string}/${contentId as string}`)

    // Respond to Client
    return response.json({
      code: 'deleted',
      message: 'The file has been successfully deleted. Below is the previous link it was available from.',
      body: {
        'Content-ID': `${contentId as string}`,
        'Namespace-ID': profile.namespace,
        'Previous-Location': `/-/${profile.namespace as string}/${contentId as string}`
      }
    })
  }
}
