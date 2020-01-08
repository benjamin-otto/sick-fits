import React from 'react'
import PleaseSignIn from '../components/PleaseSignIn'
import EditPermissions from '../components/EditPermissions'

const permissions = props => {
  return (
    <div>
      <PleaseSignIn>
        <EditPermissions />
      </PleaseSignIn>
    </div>
  )
}

export default permissions
