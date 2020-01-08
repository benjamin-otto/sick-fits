import React, { Component } from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { Mutation } from 'react-apollo'
import gql from 'graphql-tag'
import { CURRENT_USER_QUERY } from './User'


const BigButton = styled.button`
  font-size: 3rem;
  background: none;
  border: 0;
  &:hover {
    color: ${props => props.theme.red};
    cursor: pointer;
  }
`


const REMOVE_FROM_CART_MUTATION = gql`
  mutation REMOVE_FROM_CART_MUTATION($id: ID!){
    removeFromCart(id: $id){
      id
    }
  }
`

class RemoveFromCart extends Component {
  static propTypes = {
    id: PropTypes.string.isRequired
  }


  // For "Optimistic Response"  -- remove the item from UI immediately
  // Called as soon as we get a response back after the mutation is performed
  update = (cache, payload) => {
    // Read the cache    
    const data = cache.readQuery({ query: CURRENT_USER_QUERY })

    // Remove the item from the cart
    const cartItemId = payload.data.removeFromCart.id
    data.me.cart = data.me.cart.filter(cartItem => cartItem.id !== cartItemId)

    // Write it back to the cache
    cache.writeQuery({ query: CURRENT_USER_QUERY, data })
  }

  render() {
    return (
      <Mutation
        mutation={REMOVE_FROM_CART_MUTATION}
        variables={{ id: this.props.id }}
        update={this.update}
        // the response we expect from the server, runs update immedietly for a better UX
        optimisticResponse={{
          __typename: 'Mutation',
          removeFromCart: {
            __typename: 'CartItem',
            id: this.props.id
          }
        }}
      >
        {(removeFromCart, { loading }) =>
          <BigButton
            title="Delete Item."
            onClick={() => {
              removeFromCart().catch(err => alert(err.message))
            }}
            disabled={loading}
          >
            &times;
        </BigButton>
        }
      </Mutation >
    )
  }
}

export default RemoveFromCart
