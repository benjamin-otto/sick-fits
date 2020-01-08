import React, { Component } from 'react'
import StripeCheckout from 'react-stripe-checkout'
import { Mutation } from 'react-apollo'
import Router from 'next/router'
import NProgress from 'nprogress'
import gql from 'graphql-tag'
import calcTotalPrice from '../lib/calcTotalPrice'
import User, { CURRENT_USER_QUERY } from './User'

// STRIPE NOTES
// We send the CC info to Stripe.
// Stripe will then return a token that is good for a 1 time charge.
// We send this token to our backend for processing.
// This way we avoid handling the sensitive CC information.
// https://stripe.com/docs/testing   CC numbers for testing


const CREATE_ORDER_MUTATION = gql`
  mutation CREATE_ORDER_MUTATION($token: String!){
    createOrder(token: $token) {
      id 
      charge
      total
      items {
        id
        title
      }
    }
  }
`


function totalItems(cart) {
  return cart.reduce((total, cartItem) => total + cartItem.quantity, 0)
}


export class TakeMyMoney extends Component {

  onToken = async (res, createOrder) => {
    NProgress.start()

    // Manually call the mutation once we have the Stripe token
    const order = await createOrder({
      variables: {
        token: res.id
      }
    }).catch(err => {
      alert(err.message)
    })

    Router.push({
      pathname: '/order',
      query: { id: order.data.createOrder.id }
    })
  }

  render() {
    return (
      <User>
        {({ data: { me } }) => (
          <Mutation
            mutation={CREATE_ORDER_MUTATION}
            refetchQueries={[{ query: CURRENT_USER_QUERY }]}
          >
            {(createOrder) => (
              <StripeCheckout
                amount={calcTotalPrice(me.cart)}
                name="Sick Fits"
                description={`Order of ${totalItems(me.cart)} items!`}
                image={me.cart.length && me.cart[0].item && me.cart[0].item.image}
                stripeKey="pk_test_BSTSwzRj96z7m0S8TrE0bIoB00LwbMgbVj"
                currency="USD"
                email={me.email}
                token={res => this.onToken(res, createOrder)}
              >
                {this.props.children}
              </StripeCheckout>
            )}
          </Mutation>
        )}
      </User>
    )
  }
}

export default TakeMyMoney

