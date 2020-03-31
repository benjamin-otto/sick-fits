import React from 'react'
import { adopt } from 'react-adopt'
import { Query, Mutation } from 'react-apollo'
import gql from 'graphql-tag'
import User from './User'
import CartItem from './CartItem'
import TakeMyMoney from './TakeMyMoney'
import CartStyles from './styles/CartStyles'
import Supreme from './styles/Supreme'
import CloseButton from './styles/CloseButton'
import SickButton from './styles/SickButton'
import calcTotalPrice from '../lib/calcTotalPrice'
import formatMoney from '../lib/formatMoney'

// @client specifies to graph the data from the local Apollo store
const LOCAL_STATE_QUERY = gql`
  query {
    cartOpen @client 
  }
`

const TOGGLE_CART_MUTATION = gql`
  mutation {
    toggleCart @client
  }
`

// Use this to avoid the nesting query/mutation mess
// This works fine, but react-apollo complains about required prop children, so we do as below
// const Composed = adopt({
//   user: <User />,
//   toggleCart: <Mutation mutation={TOGGLE_CART_MUTATION} />,
//   localState: <Query query={LOCAL_STATE_QUERY} />
// })
const Composed = adopt({
  user: ({ render }) => <User>{render}</User>,
  toggleCart: ({ render }) => <Mutation mutation={TOGGLE_CART_MUTATION}>{render}</Mutation>,
  localState: ({ render }) => <Query query={LOCAL_STATE_QUERY}>{render}</Query>
})


const Cart = props => (
  <Composed>
    {({ user, toggleCart, localState }) => {

      const me = user.data.me
      if (!me) return null

      return (
        <CartStyles open={localState.data.cartOpen}>
          <header>
            <CloseButton onClick={toggleCart} title="close">&times;</CloseButton>
            <Supreme>{me.name}'s' Cart</Supreme>
            <p>You have {me.cart.length} item{me.cart === 1 ? '' : 's'} in your cart.</p>
          </header>
          <ul>
            {me.cart.map(cartItem =>
              <CartItem cartItem={cartItem} key={cartItem.id} />
            )}
          </ul>
          <footer>
            <p>{formatMoney(calcTotalPrice(me.cart))}</p>
            {me.cart.length && (
              <TakeMyMoney>
                <SickButton>Checkout</SickButton>
              </TakeMyMoney>
            )}
          </footer>
        </CartStyles>
      )
    }}

  </Composed >
)


export default Cart
export { LOCAL_STATE_QUERY, TOGGLE_CART_MUTATION }