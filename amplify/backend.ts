import { defineBackend } from '@aws-amplify/backend';
import { HttpApi, CorsHttpMethod, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { eodProxy } from './functions/eodProxy/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  eodProxy,
});

const eodProxyApiStack = backend.createStack('eod-proxy-api-stack');

const eodProxyApi = new HttpApi(eodProxyApiStack, 'EodProxyApi', {
  corsPreflight: {
    allowMethods: [CorsHttpMethod.GET, CorsHttpMethod.OPTIONS],
    allowOrigins: ['*'],
    allowHeaders: ['*'],
  },
});

eodProxyApi.addRoutes({
  path: '/eod/{symbol}',
  methods: [HttpMethod.GET],
  integration: new HttpLambdaIntegration('EodProxyIntegration', backend.eodProxy.resources.lambda),
});

backend.addOutput({
  custom: {
    eodProxyUrl: eodProxyApi.url,
  },
});
