import { defineAuth } from '@aws-amplify/backend';
import { preSignUp } from './pre-sign-up/resource';

export const auth = defineAuth({
  loginWith: {
    email: {
      verificationEmailSubject: 'Stonkstable: verify your email',
    },
  },
  triggers: {
    preSignUp,
  },
});
