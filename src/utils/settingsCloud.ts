import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { unwrap } from './amplify';

const client = () => generateClient<Schema>();

export async function loadCloudApiKey(): Promise<string | null> {
  const [settings] = unwrap(await client().models.UserSettings.list());
  return settings?.eodhdApiKey || null;
}

export async function saveCloudApiKey(apiKey: string): Promise<void> {
  const userSettings = client().models.UserSettings;
  const [existing] = unwrap(await userSettings.list());

  if (existing) {
    unwrap(await userSettings.update({ id: existing.id, eodhdApiKey: apiKey }));
  } else {
    unwrap(await userSettings.create({ eodhdApiKey: apiKey }));
  }
}
