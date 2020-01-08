import React, { Component } from 'react'
import { Query, Mutation } from 'react-apollo'
import gql from 'graphql-tag'
import Error from '../components/ErrorMessage'
import Table from '../components/styles/Table'
import SickButton from '../components/styles/SickButton'
import PropTypes from 'prop-types'

const PERMISSIONS = [
  'ADMIN',
  'USER',
  'ITEM_CREATE',
  'ITEM_UPDATE',
  'ITEM_DELETE',
  'PERMISSION_UPDATE'
]

const ALL_USERS_QUERY = gql`
  query ALL_USERS_QUERY {
    users {
      id
      name
      email
      permissions
    }
  }
`

const UPDATE_PERMISSIONS_MUTATION = gql`
  mutation UPDATE_PERMISSIONS_MUTATION($userId: ID!, $permissions: [Permission]){
    updatePermissions(userId: $userId, permissions: $permissions) {
      id
      name
      email
      permissions
    }
  }
`

class Permissions extends Component {
  render() {
    return (
      <Query query={ALL_USERS_QUERY}>
        {({ data, loading, error }) => (
          <div>
            <Error error={error} />
            <h2>Manage Permissions</h2>
            <Table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  {PERMISSIONS.map(permission => <th key={permission}>{permission}</th>)}
                  <th>🔰</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map(user => <UserPermissions user={user} key={user.id} />)}
              </tbody>
            </Table>

          </div>
        )}
      </Query>
    )
  }
}

class UserPermissions extends Component {

  static propTypes = {
    user: PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      email: PropTypes.string.isRequired,
      permissions: PropTypes.array.isRequired
    }).isRequired
  }

  state = {
    permissions: this.props.user.permissions
  }

  handlePermissionChange = ({ target: checkbox }) => {
    // copy current permissions
    let updatedPermissions = [...this.state.permissions]

    if (checkbox.checked)
      updatedPermissions.push(checkbox.value)
    else
      updatedPermissions = updatedPermissions.filter(permission => permission !== checkbox.value)

    this.setState({ permissions: updatedPermissions })
  }

  render() {
    const { user } = this.props
    const { permissions } = this.state

    return (
      <Mutation
        mutation={UPDATE_PERMISSIONS_MUTATION}
        variables={{
          userId: user.id,
          permissions
        }}
      >
        {(updatePermissions, { loading, error }) => (
          <>
            {error && <tr><td colSpan="9"><Error error={error} /></td></tr>}
            <tr>
              <td>{user.name}</td>
              <td>{user.email}</td>
              {PERMISSIONS.map(permission => (
                <td key={`${user.id}-${permission}`}>
                  <label htmlFor={`${user.id}-${permission}`}>
                    <input
                      id={`${user.id}-${permission}`}
                      type="checkbox"
                      name={`${user.id}-${permission}`}
                      checked={permissions.includes(permission)}
                      value={permission}
                      onChange={this.handlePermissionChange} />
                  </label>
                </td>
              ))
              }
              <td>
                <SickButton type="button" disabled={loading} onClick={updatePermissions}>
                  Updat{loading ? 'ing' : 'e'}
                </SickButton>
              </td>
            </tr>
          </>
        )}
      </Mutation>
    )
  }
}


export default Permissions