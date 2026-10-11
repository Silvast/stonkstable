import type { PreSignUpTriggerHandler } from 'aws-lambda';
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';

const REJECTED = 'Sign-up is by invitation only.';
const CACHE_MS = 60_000;

const ssm = new SSMClient();
let cached: { emails: Set<string>; loadedAt: number } | null = null;

const normalise = (email: string) => email.trim().toLowerCase();

const parseAllowedEmails = (value: string): Set<string> =>
  new Set(value.split(/[\s,]+/).map(normalise).filter(Boolean));

const loadAllowedEmails = async (): Promise<Set<string>> => {
  if (cached && Date.now() - cached.loadedAt < CACHE_MS) return cached.emails;

  const name = process.env.ALLOWED_EMAILS_PARAMETER;
  if (!name) throw new Error('ALLOWED_EMAILS_PARAMETER is not set');

  const { Parameter } = await ssm.send(new GetParameterCommand({ Name: name, WithDecryption: true }));
  const emails = parseAllowedEmails(Parameter?.Value ?? '');
  cached = { emails, loadedAt: Date.now() };
  return emails;
};

export const handler: PreSignUpTriggerHandler = async (event) => {
  if (event.triggerSource === 'PreSignUp_AdminCreateUser') return event;

  let allowed: Set<string>;
  try {
    allowed = await loadAllowedEmails();
  } catch (err) {
    console.error('Could not read the sign-up allowlist:', err);
    throw new Error(REJECTED);
  }

  const email = normalise(event.request.userAttributes.email ?? '');
  if (!email || !allowed.has(email)) throw new Error(REJECTED);

  return event;
};
