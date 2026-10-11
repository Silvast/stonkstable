import { Authenticator, Theme, ThemeProvider } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const theme: Theme = {
  name: 'stonkstable',
  tokens: {
    colors: {
      brand: {
        primary: {
          10: { value: '#E6F0FA' },
          80: { value: '#0066CC' },
          90: { value: '#0052A3' },
          100: { value: '#003D7A' },
        },
      },
    },
    fonts: {
      default: {
        variable: { value: FONT },
        static: { value: FONT },
      },
    },
  },
};

const AuthenticatorPanel = () => (
  <ThemeProvider theme={theme}>
    <Authenticator variation="default" />
  </ThemeProvider>
);

export default AuthenticatorPanel;
