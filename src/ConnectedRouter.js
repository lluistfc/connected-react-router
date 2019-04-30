import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { Router } from 'react-router'
import { onLocationChanged } from './actions'

const createConnectedRouter = (structure) => {
  const { getIn, toJS } = structure
  /*
   * ConnectedRouter listens to a history object passed from props.
   * When history is changed, it dispatches action to redux store.
   * Then, store will pass props to component to render.
   * This creates uni-directional flow from history->store->router->components.
   */

  class ConnectedRouter extends Component {
    componentDidMount() {
      const { store, history, onLocationChanged } = this.props

      this.inTimeTravelling = false

      // Subscribe to store changes to check if we are in time travelling
      this.unsubscribe = store.subscribe(() => {
        // Extract store's location
        const {
          pathname: pathnameInStore,
          search: searchInStore,
          hash: hashInStore,
        } = toJS(getIn(store.getState(), ['router', 'location']))
        // Extract history's location
        const {
          pathname: pathnameInHistory,
          search: searchInHistory,
          hash: hashInHistory,
        } = history.location

        // If we do time travelling, the location in store is changed but location in history is not changed
        if (history.action === 'PUSH' && (pathnameInHistory !== pathnameInStore || searchInHistory !== searchInStore || hashInHistory !== hashInStore)) {
          this.inTimeTravelling = true
          // Update history's location to match store's location
          history.push({
            pathname: pathnameInStore,
            search: searchInStore,
            hash: hashInStore,
          })
        }
      })

      const handleLocationChange = (location, action) => {
        // Dispatch onLocationChanged except when we're in time travelling
        if (!this.inTimeTravelling) {
          onLocationChanged(location, action)
        } else {
          this.inTimeTravelling = false
        }
      }

      // Listen to history changes
      this.unlisten = history.listen(handleLocationChange)
    }

    componentWillUnmount() {
      this.unlisten()
      this.unsubscribe()
    }

    render() {
      const { history, children } = this.props

      return (
        <Router history={history}>
          { children }
        </Router>
      )
    }
  }

  ConnectedRouter.contextTypes = {
    store: PropTypes.shape({
      getState: PropTypes.func.isRequired,
      subscribe: PropTypes.func.isRequired,
    }).isRequired,
  }

  ConnectedRouter.propTypes = {
    history: PropTypes.shape({
      action: PropTypes.string.isRequired,
      listen: PropTypes.func.isRequired,
      location: PropTypes.object.isRequired,
      push: PropTypes.func.isRequired,
    }).isRequired,
    location: PropTypes.oneOfType([
      PropTypes.object,
      PropTypes.string,
    ]).isRequired,
    action: PropTypes.string.isRequired,
    basename: PropTypes.string,
    children: PropTypes.oneOfType([ PropTypes.func, PropTypes.node ]),
    onLocationChanged: PropTypes.func.isRequired,
  }

  const mapStateToProps = state => ({
    action: getIn(state, ['router', 'action']),
    location: getIn(state, ['router', 'location']),
  })

  const mapDispatchToProps = dispatch => ({
    onLocationChanged: (location, action) => dispatch(onLocationChanged(location, action))
  })

  return connect(mapStateToProps, mapDispatchToProps)(ConnectedRouter)
}

export default createConnectedRouter
