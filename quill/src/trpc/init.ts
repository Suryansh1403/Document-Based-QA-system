import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { initTRPC, TRPCError } from '@trpc/server';
import { cache } from 'react';
export const createTRPCContext = cache(async () => {
  /**
   * @see: https://trpc.io/docs/server/context
   */
  return { userId: 'user_123' };
});

const t = initTRPC.create({
  /**
   * @see https://trpc.io/docs/server/data-transformers
   */
  // transformer: superjson,
});
const middleware = t.middleware
const isAuth = middleware(async (opts) => {
  const { getUser } = getKindeServerSession()
  const user = await getUser()

  if (!user || !user.id) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }

  return opts.next({
    ctx: {
      userId: user.id,
      user,
    },
  })
})

// Base router and procedure helpers
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;
export const privateProcedure = t.procedure.use(isAuth)
