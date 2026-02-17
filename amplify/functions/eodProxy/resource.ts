import { defineFunction } from '@aws-amplify/backend';

export const eodProxy = defineFunction({
  name: 'eod-proxy',
  entry: './handler.ts',
  timeoutSeconds: 30,
});
