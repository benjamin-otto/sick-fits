import React, { Component } from 'react'
import Downshift, { resetIdCounter } from 'downshift'
import Router from 'next/router'
import { ApolloConsumer } from 'react-apollo'
import gql from 'graphql-tag'
import debounce from 'lodash.debounce'
import { DropDown, DropDownItem, SearchStyles } from './styles/DropDown'

const SEARCH_ITEMS_QUERY = gql`
  query SEARCH_ITEMS_QUERY($searchTerm: String!){
    items(where: {
      OR: [
        {title_contains: $searchTerm},
        {description_contains: $searchTerm}
      ]
    }) {
      id
      title
      image       
    }
  }
`

function routeToItem(item) {
  Router.push({
    pathname: '/item',
    query: {
      id: item.id
    }
  })
}


class AutoComplete extends Component {

  state = {
    items: [],
    loading: false
  }

  // Debounce - only fire after 350 ms, so we don't fire after each key up
  onChange = debounce(async (e, client) => {
    this.setState({ loading: true })

    const res = await client.query({
      query: SEARCH_ITEMS_QUERY,
      variables: {
        searchTerm: e.target.value
      }
    })

    this.setState({
      items: res.data.items,
      loading: false
    })
  }, 350)

  render() {

    // Fixes an issue with ids not matching up 
    resetIdCounter()

    return (
      <SearchStyles>
        {/* itemToString = string to show in search box after selection */}
        {/* Downshift provides functionality like closing by clicking outside, highlighting and such */}
        <Downshift
          itemToString={item => item === null ? '' : item.title}
          onChange={routeToItem}
        >
          {({ getInputProps, getItemProps, isOpen, inputValue, highlightedIndex }) => (
            <div>
              {/* Gives us access to the Apollo client so we can manually query
                instead of query on page load with <Query></Query>  */}
              <ApolloConsumer>
                {(client) => (
                  <input
                    {...getInputProps({
                      id: 'search',
                      type: 'search',
                      placeholder: 'Search for an item...',
                      onChange: e => {
                        e.persist()
                        this.onChange(e, client)
                      },
                      'className': this.state.loading ? 'loading' : ''
                    })}
                  />
                )}
              </ApolloConsumer>
              {/* isOpen allows user to click outside the dropdown or hit esc to close the dropdown */}
              {isOpen && (
                <DropDown>
                  {/* items found for search term */}
                  {this.state.items.map((item, index) => (
                    <DropDownItem
                      key={item.id}
                      highlighted={index === highlightedIndex}  // check DropDown.js for props.highligted
                      {...getItemProps({ item })}
                    >
                      <img src={item.image} alt={item.title} width="50" />
                      {item.title}
                    </DropDownItem>
                  ))}

                  {/* No search results */}
                  {!this.state.items.length && !this.state.loading && (
                    <DropDownItem>
                      Nothing found for {inputValue}
                    </DropDownItem>
                  )}
                </DropDown>
              )}
            </div>
          )}
        </Downshift>
      </SearchStyles>
    )
  }
}

export default AutoComplete