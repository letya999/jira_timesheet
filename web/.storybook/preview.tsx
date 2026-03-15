import type { Preview } from '@storybook/react';
import { withThemeByDataAttribute } from '@storybook/addon-themes';
import { mswDecorator, mswLoader } from '../src/mocks/decorators/msw-decorator';
import { createMemoryHistory, createRootRoute, createRouter, RouterContextProvider } from '@tanstack/react-router';
import '../src/styles/index.css';
import * as React from 'react';

const rootRoute = createRootRoute();
const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory() });

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#f4f5f7' },
        { name: 'dark', value: '#1d2125' },
      ],
    },
  },
  loaders: [mswLoader],
  decorators: [
    mswDecorator,
    (Story) => (
      <RouterContextProvider router={router}>
        <Story />
      </RouterContextProvider>
    ),
    withThemeByDataAttribute({
      themes: {
        light: 'light',
        dark: 'dark',
      },
      defaultTheme: 'light',
      attributeName: 'data-theme',
    }),
  ],
};

export default preview;
