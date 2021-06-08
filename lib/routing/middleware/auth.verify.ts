import { getHasher } from 'cryptocipher'
import type { Next, Request, Response } from 'restify'
import { ConflictError, UnauthorizedError } from 'restify-errors'
import type { CDNServer } from '../../../index'

export class AuthMiddleware {
  private static server: CDNServer

  public static async email (request: Request, response: Response, next: Next): Promise<void> {
    const { email } = request.params as { email: string | undefined; }

    if (email === undefined) {
      next(new UnauthorizedError('IdentityRejected: You must specify the email address associated with your account using a Multi-part Form body. Please use \'email\' as the key.'))
      return
    }

    if (!await AuthMiddleware.server.users.has(email)) {
      next(new ConflictError('IdentityRejected: The requested email may already exist, require verification, or be permanently disabled.'))
      return
    }

    next()
  }

  public static async password (request: Request, response: Response, next: Next): Promise<void> {
    const { email, password } = request.params as { email: string | undefined; password: string | undefined; }

    if (password === undefined) {
      next(new UnauthorizedError('IdentityRejected: You must specify the password associated with your account using a Multi-part Form body. Please use \'password\' as the key.'))
      return
    }

    const profile = await AuthMiddleware.server.users.get(email) as { password: string; token: string; }

    const hasher = getHasher('sha512')
    const hash = (await hasher.digest({
      content: password,
      digest: 'hex',
      iter: 20000
    })).content

    if (profile.password !== hash) {
      next(new UnauthorizedError('IdentityRejected: The request password may be incorrect, disabled, or throttled to prevent abuse.'))
      return
    }

    next()
  }

  public static async token (request: Request, response: Response, next: Next): Promise<void> {
    const { email, token } = request.params as { email: string | undefined; token: string | undefined; }

    if (token === undefined) {
      next(new UnauthorizedError('IdentityRejected: You must specify the token associated with your account using a Multi-part Form body. Please use \'token\' as the key.'))
      return
    }

    const profile = await AuthMiddleware.server.users.get(email) as { token: string; }
    if (profile.token !== token) {
      next(new UnauthorizedError('IdentityRejected: The request token may be incorrect, throttled, or be permanently disabled to prevent abuse.'))
      return
    }

    next()
  }

  public setServer (server: CDNServer): void {
    AuthMiddleware.server = server
  }
}
