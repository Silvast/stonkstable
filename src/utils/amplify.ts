import { Amplify } from 'aws-amplify';

type AmplifyConfig = Parameters<typeof Amplify.configure>[0];

const found = import.meta.glob('../../amplify_outputs.json', { eager: true, import: 'default' });
const outputs = Object.values(found)[0] as AmplifyConfig | undefined;

export const cloudEnabled = Boolean(outputs);

export function configureAmplify(): void {
  if (outputs) Amplify.configure(outputs);
}

interface CloudResult<T> {
  data: T;
  errors?: readonly { message: string }[];
}

export function unwrap<T>({ data, errors }: CloudResult<T>): T {
  if (errors?.length) throw new Error(errors.map(error => error.message).join('; '));
  return data;
}
