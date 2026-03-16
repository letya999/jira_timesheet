import { createRoute } from '@tanstack/react-router'
import { rootRoute } from './__root'
import { BadGatewayPage } from './bad-gateway-page'

export const badGatewayRoute = createRoute({
  path: '/502',
  getParentRoute: () => rootRoute,
  component: BadGatewayPage,
})
