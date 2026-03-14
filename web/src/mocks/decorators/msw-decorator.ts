import { initialize, mswLoader } from 'msw-storybook-addon'

initialize({ onUnhandledRequest: 'bypass' })

export const mswDecorator = (story: any) => story()
export { mswLoader }
