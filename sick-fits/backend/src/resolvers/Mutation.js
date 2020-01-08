const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { randomBytes } = require('crypto')
const { promisify } = require('util')
const { transport, createEmail } = require('../mail')
const { hasPermission } = require('../utils')
const stripe = require('../stripe')

const Mutations = {
  async createItem(parent, args, ctx, info) {
    // Check if user is logged in, userId set by middleware
    if (!ctx.request.userId) {
      throw new Error('You must be logged in to create an item.')
    }

    // "connect" is how we create relationships in Prisma
    const item = await ctx.db.mutation.createItem({
      data: {
        user: {
          connect: {
            id: ctx.request.userId
          }
        },
        ...args
      }
    }, info)

    return item
  },

  updateItem(parent, args, ctx, info) {
    // make a copy of the updates
    const updates = { ...args }
    // remove the ID
    delete updates.id

    return ctx.db.mutation.updateItem({
      data: updates,
      where: { id: args.id }
    }, info)
  },

  async deleteItem(parent, args, ctx, info) {
    // Find the items
    const where = { id: args.id }
    const item = await ctx.db.query.item({ where }, `{ id title user { id } }`)

    // Check if the user owns the item or has correct permissions
    const ownsItem = item.user.id === ctx.request.userId
    const hasPermissions = ctx.request.user.permissions.some(
      permission => ['ADMIN', 'ITEM_DELETE'].includes(permission))

    if (!ownsItem && !hasPermissions)
      throw new Error('You are not allowed')

    // Delete item
    return ctx.db.mutation.deleteItem({ where }, info)
  },

  async signup(parent, args, ctx, info) {
    // Change email to lowercase
    args.email = args.email.toLowerCase()
    // Hash user password
    const password = await bcrypt.hash(args.password, 10)
    // Create user in DB (with Prisma generated mutation)
    const user = await ctx.db.mutation.createUser({
      data: {
        ...args,
        password,
        permissions: { set: ['USER'] }
      }
    }, info)
    // Create JWT token
    const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET)
    // Set JWT as a cookie on the response so it comes along on all following requests
    ctx.response.cookie('token', token, {
      httpOnly: true,                       // the cookie cannot be accessed through client side script (security)
      maxAge: 1000 * 60 * 60 * 24 * 365,    // 1 year cookie
    })
    // Return user to the browser
    return user
  },

  async signin(parent, { email, password }, ctx, info) {
    // Check if user with that email
    const user = await ctx.db.query.user({ where: { email } })
    if (!user) {
      // Caught by our query/mutation
      throw new Error(`No user found for email ${email}`)
    }

    // Check if password is correct
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      throw new Error('Invalid password.')
    }

    // Generate JWT 
    const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET)

    // Set JWT as a cookie on the response so it comes along on all following requests
    // cookie is a method from our cookieParser middleware?
    ctx.response.cookie('token', token, {
      httpOnly: true,                       // the cookie cannot be accessed through client side script (security)
      maxAge: 1000 * 60 * 60 * 24 * 365,    // 1 year cookie
    })

    // Return user
    return user
  },

  signout(parent, args, ctx, info) {
    // the clearCookie method is from the cookieParser middleware
    ctx.response.clearCookie('token')
    // this Type is defined in the schema
    return { message: 'Goodbye!' }
  },

  async requestReset(parent, args, ctx, info) {
    // Check if real user
    const user = await ctx.db.query.user({ where: { email: args.email } })
    if (!user) {
      throw new Error(`No user found for email ${args.email}`)
    }

    // Set reset token and expiry
    // Currently randomBytes is synchronous, so we promisify it here
    const randomBytesProm = promisify(randomBytes)
    const resetToken = (await randomBytesProm(20)).toString('hex')
    const resetTokenExpiry = Date.now() + 3600000 // 1 hour from now
    const updatedUser = await ctx.db.mutation.updateUser({
      where: { email: args.email },
      data: { resetToken, resetTokenExpiry }
    })

    // Email reset token 
    const resetLink = `${process.env.FRONTEND_URL}/reset?resetToken=${resetToken}`
    const htmlContent = `Your password reset link: \n\n <a href="${resetLink}">Click here to reset</a>`
    const mailRes = await transport.sendMail({
      from: 'sickfits@test.com',
      to: user.email,
      subject: 'Sick-Fits: Your Password Reset',
      html: createEmail(htmlContent)
    })

    return { message: 'Success!' }
  },

  async resetPassword(parent, args, ctx, info) {
    const { resetToken, password, confirmPassword } = args

    // Check if the passwords match
    if (password !== confirmPassword) {
      throw new Error('Confirm password does not match.')
    }

    // Check if it is a legit reset token
    // Using query.users instead of query.user because there are more "where" options, check the Prisma generated for more
    const [user] = await ctx.db.query.users({
      where: {
        resetToken,
        resetTokenExpiry_gte: Date.now()
      }
    })
    if (!user) {
      throw new Error('Invalid or expired reset token.')
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10)

    // Update user password and remove reset token
    const updatedUser = await ctx.db.mutation.updateUser({
      where: { id: user.id },
      data: { password: passwordHash, resetToken: null, resetTokenExpiry: null }
    })

    // Generate the JWT
    const token = jwt.sign({ userId: updatedUser.id }, process.env.APP_SECRET)

    // Set JWT cookie
    ctx.response.cookie('token', token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365
    })

    return updatedUser
  },

  async updatePermissions(parent, args, ctx, info) {
    // check user is logged in
    if (!ctx.request.userId) {
      throw new Error('You must be logged in to continue.')
    }

    // check user has the correct permissions
    hasPermission(ctx.request.user, ['ADMIN', 'PERMISSION_UPDATE'])

    // update the permissions
    return ctx.db.mutation.updateUser({
      where: {
        id: args.userId
      },
      data: {
        permissions: { set: args.permissions }        // Prisma's syntax when using ENUM
      }
    }, info)
  },

  async addToCart(parent, args, ctx, info) {
    const { userId } = ctx.request

    // check user is logged in
    if (!userId) {
      throw new Error('You must be logged in to continue.')
    }

    // Query the user's cart 
    const [existingCartItem] = await ctx.db.query.cartItems({
      where: {
        user: { id: userId },
        item: { id: args.id }
      }
    })

    // Check if item already in cart, increment by 1 if it is 
    if (existingCartItem) {
      console.log("Item already in cart.")
      return ctx.db.mutation.updateCartItem({
        where: { id: existingCartItem.id },
        data: { quantity: existingCartItem.quantity + 1 }
      }, info)
    }

    // Else create a new CartItem
    return ctx.db.mutation.createCartItem({
      data: {
        user: {
          connect: { id: userId }
        },
        item: {
          connect: { id: args.id }
        }
      }
    }, info)
  },

  async removeFromCart(parent, args, ctx, info) {
    // Find the cart item
    const cartItem = await ctx.db.query.cartItem({
      where: { id: args.id }
    }, `{ id, user { id }}`)                                      // manuel query

    if (!cartItem)
      throw new Error('No item found.')

    // Check item is in user's cart
    if (cartItem.user.id !== ctx.request.userId)
      throw new Error('Not your item!')

    // Delete cart item
    return ctx.db.mutation.deleteCartItem({
      where: { id: args.id }
    }, info)
  },

  async createOrder(parent, args, ctx, info) {
    // Query the current user
    const { userId } = ctx.request
    if (!userId)
      throw new Error('You must be signed in to complete this action.')

    const user = await ctx.db.query.user({ where: { id: userId } },
      `{
      id 
      name 
      email 
      cart { 
        id 
        quantity 
        item { 
          id 
          title 
          price 
          description 
          image 
          largeImage
        }
      }
    }`)

    // Recalculate the total for the price (don't use the client's price)
    const amount = user.cart.reduce((total, cartItem) => total + cartItem.item.price * cartItem.quantity, 0)

    console.log(`Charging: ${amount}`)

    // Create and process the Stipe charge
    const charge = await stripe.charges.create({
      amount,
      currency: 'USD',
      source: args.token
    })

    // Convert the CartItems to OrderItems
    const orderItems = user.cart.map(cartItem => {
      const orderItem = {
        ...cartItem.item,
        quantity: cartItem.quantity,
        user: { connect: { id: userId } }
      }

      // We don't want the id
      delete orderItem.id

      return orderItem
    })

    // Create the Order
    const order = await ctx.db.mutation.createOrder({
      data: {
        total: charge.amount,
        charge: charge.id,
        items: { create: orderItems },          // Prisma creates the Order Items and then makes the relaionship here, in 1 statement,  don't have to create the Order Items first then save IDs here.
        user: { connect: { id: userId } }
      }
    })

    // Clear the user's cart, delete cart items
    const cartItemIds = user.cart.map(cartItem => cartItem.id)
    await ctx.db.mutation.deleteManyCartItems({
      where: {
        id_in: cartItemIds
      }
    })

    // Return Order to the client
    return order
  }
}

module.exports = Mutations
