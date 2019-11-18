const { forwardTo } = require('prisma-binding')

const Query = {
  // If the query is exactly how Prisma has defined it we can just forward it
  items: forwardTo('db')
  // This does the same as the above line...
  // async items(parent, args, ctx, info) {
  //   const items = await ctx.db.query.items()
  //   return items
  // }
}

module.exports = Query
