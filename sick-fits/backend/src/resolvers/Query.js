const { forwardTo } = require('prisma-binding')
const { hasPermission } = require('../utils')

const Query = {
  item: forwardTo('db'),
  itemsConnection: forwardTo('db'),
  items: forwardTo('db'),
  // If the query is exactly how Prisma has defined it we can just forward it
  // async items(parent, args, ctx, info) {
  //   const items = await ctx.db.query.items()
  //   return items
  // }

  me(parent, args, ctx, info) {
    // check if there is a current user ID logged in
    // user id is set in index.js from the token in the cookie
    if (!ctx.request.userId) {
      return null
    }

    return ctx.db.query.user({
      where: { id: ctx.request.userId }
    }, info)
  },
  async users(parent, args, ctx, info) {
    // Check if user is logged in
    if (!ctx.request.userId) {
      throw new Error('You must be logged in to perform this action.')
    }

    // Check if the user has the permission to query all of the users
    const user = await ctx.db.query.user({ where: { id: ctx.request.userId } }, info)

    hasPermission(user, ['ADMIN', 'PERMISSION_UPDATE'])

    return await ctx.db.query.users({}, info)

  },
  async order(parent, args, ctx, info) {
    // Check user logged in
    if (!ctx.request.userId)
      throw new Error('You must be logged in to perform this action.')

    // Query order
    const order = await ctx.db.query.order({
      where: { id: args.id }
    }, info)

    console.log(order)

    // Check permissions
    const ownsOrder = order.user.id === ctx.request.userId
    const hasPermissionToSeeOrder = ctx.request.user.permissions.includes('ADMIN')
    if (!ownsOrder && !hasPermissionToSeeOrder)
      throw new Error('You cannot see this.')

    // Return Order
    return order
  },
  async orders(parent, args, ctx, info) {
    // Check user logged in
    const { userId } = ctx.request
    if (!userId)
      throw new Error('You must be logged in to perform this action.')

    return ctx.db.query.orders({
      where: {
        user: { id: userId }
      }
    }, info)
  }


}

module.exports = Query
