import { randomBytes } from 'crypto'
import { getHasher } from 'cryptocipher'
import { copyFile, mkdir, stat } from 'fs/promises'
import { DateTime, Duration } from 'luxon'
import ms from 'ms'
import { basename, extname, resolve } from 'path'
import { Next, plugins, Request, Response } from 'restify'
import { ConflictError, UnsupportedMediaTypeError } from 'restify-errors'
import { CDNServer } from '../../../..'
import { AuthMW } from '../../middleware/auth.verify'
import { GenericRoute } from '../../route'

export class Route extends GenericRoute {
  constructor (server: CDNServer) {
    super(server)

    this.configure({
      path: '/v1/-/upload',
      allow: 'post',
      middleware: [
        plugins.throttle({
          burst: 2,
          rate: 2.0,
          xff: true,
          maxKeys: 65535
        }),
        AuthMW.email,
        AuthMW.token
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
    const { email, name, type, expire_after: expireAfter } = request.params

    const upload = request.files?.upload

    if (upload === undefined) {
      return next(new UnsupportedMediaTypeError('You must specify the uploaded file using upload as the parameter or multi-part body request key.'))
    }

    // Get Extension or ''
    const extension = extname(upload.name)

    // Generate Namespace Directory
    const profile = await this.server.users.get(email)
    await mkdir(resolve(__dirname, `../../../../namespace/${profile.namespace as string}`), { recursive: true })

    // Generate Object Hash
    const hasher = getHasher('sha1')
    let seed = await hasher.digest({
      content: randomBytes(128).toString('base64'),
      digest: 'hex'
    })
    if (name !== undefined) seed.content = basename(name, extname(name))

    const file = resolve(__dirname, `../../../../namespace/${profile.namespace as string}/${seed.content}${extension}`)
    let st = await stat(file).catch(() => { return null })

    if (name !== undefined && st !== null) {
      return next(new ConflictError(`ContentRejected: The requested name, '${name as string}', already exists on the server. Please delete this key first before attempting to reuse this name.`))
    }

    while (st !== null) {
      seed = await hasher.digest({
        content: randomBytes(128).toString('base64'),
        digest: 'hex'
      })
      st = await stat(resolve(__dirname, `../../../../namespace/${profile.namespace as string}/${seed.content}${extension}`)).catch(() => { return null })
    }

    // Transfer Uploaded File to Persistent Disk
    await copyFile(upload.path, file)

    // Set Expire
    let expire
    if (expireAfter !== undefined) {
      const milliseconds = ms(expireAfter as string)
      expire = milliseconds > 0 ? DateTime.local().toUTC().plus(Duration.fromObject({ milliseconds: milliseconds })).toUTC().toISO() : null
    }

    // Write Index to Database
    await this.server.index.set(`${profile.namespace as string}/${seed.content}${extension}`, {
      email,
      file,
      name,
      type,
      upload,
      expire
    })

    // Respond to Client
    return response.json({
      code: 'Created',
      message: 'The file has been successfully uploaded. You can find and view it at the following link.',
      body: {
        'Content-ID': `${seed.content}${extension}`,
        'Namespace-ID': profile.namespace,
        Location: `/-/${profile.namespace as string}/${seed.content}${extension}`
      }
    })
  }
}
