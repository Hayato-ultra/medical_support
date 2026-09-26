import { db as prismaDb } from '@/prisma/db'

/**
 * Application DB handle.
 *
 * Prisma 8 emits every relation in this contract as `__unbound__`, so the
 * generated `create`/`update` payload types collapse to `never` even though
 * the payloads are valid at runtime. Reads resolve fine, but any write that
 * touches a relation or an `Int`-backed flag fails to type check. Casting the
 * ORM surface once here keeps call sites readable instead of scattering
 * `as never` across every route.
 */
type LooseOrm = Record<
  string,
  {
    where: (...args: any[]) => any
    findFirst: (...args: any[]) => any
    findUnique: (...args: any[]) => any
    create: (...args: any[]) => any
    createMany?: (...args: any[]) => any
    update: (...args: any[]) => any
    updateMany: (...args: any[]) => any
    delete: (...args: any[]) => any
    deleteMany?: (...args: any[]) => any
    count: (...args: any[]) => any
    aggregate?: (...args: any[]) => any
    groupBy?: (...args: any[]) => any
  }
>

export const db = { orm: prismaDb.orm as unknown as LooseOrm }

/** Full typed client — use when you need the generated model row types. */
export { prismaDb as rawDb }
