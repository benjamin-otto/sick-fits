import withApollo from 'next-with-apollo';
import ApolloClient from 'apollo-boost';
import { endpoint } from '../config';
import { LOCAL_STATE_QUERY } from '../components/Cart'

function createClient({ headers }) {
  return new ApolloClient({
    uri: process.env.NODE_ENV === 'development' ? endpoint : endpoint,
    request: operation => {
      operation.setContext({
        fetchOptions: {
          credentials: 'include',
        },
        headers,
      });
    },
    // local data, can query and mutate the same as if it were a backend
    clientState: {
      resolvers: {
        Mutation: {
          // not sure what _ is doing here
          toggleCart(_, variables, { cache }) {
            // const { cache } = client
            // we must use a query to read from the cache!
            const { cartOpen } = cache.readQuery({
              query: LOCAL_STATE_QUERY
            })
            // Write the toggled cart state to cache
            const data = {
              data: { cartOpen: !cartOpen }
            }
            cache.writeData(data)
            return data
          },
        }
      },
      defaults: {
        cartOpen: false,
      },
    }
  });
}

export default withApollo(createClient);
