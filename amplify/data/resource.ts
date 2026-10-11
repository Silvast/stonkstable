import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  Favourite: a
    .model({
      code: a.string().required(),
      exchange: a.enum(['US', 'HE', 'LSE']),
      name: a.string(),
      currency: a.string(),
      addedAt: a.datetime(),
    })
    .authorization((allow) => [allow.owner()]),

  UserSettings: a
    .model({
      eodhdApiKey: a.string(),
    })
    .authorization((allow) => [allow.owner()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
