import { defineFunction } from '@aws-amplify/backend';

export const ALLOWED_EMAILS_PARAMETER = '/stonkstable/allowed-signup-emails';

export const preSignUp = defineFunction({
  name: 'pre-sign-up',
  resourceGroupName: 'auth',
  environment: {
    ALLOWED_EMAILS_PARAMETER,
  },
});
