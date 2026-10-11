import { defineBackend } from '@aws-amplify/backend';
import { Stack } from 'aws-cdk-lib';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { ALLOWED_EMAILS_PARAMETER, preSignUp } from './auth/pre-sign-up/resource';

const backend = defineBackend({
  auth,
  data,
  preSignUp,
});

const preSignUpLambda = backend.preSignUp.resources.lambda;
const { region, account } = Stack.of(preSignUpLambda);

preSignUpLambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['ssm:GetParameter'],
    resources: [`arn:aws:ssm:${region}:${account}:parameter${ALLOWED_EMAILS_PARAMETER}`],
  })
);
