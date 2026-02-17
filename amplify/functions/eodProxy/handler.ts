type HttpEvent = {
  pathParameters?: {
    symbol?: string;
  };
  queryStringParameters?: Record<string, string | undefined>;
  headers?: Record<string, string | undefined>;
};

type HttpResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

const buildCorsHeaders = (originHeader?: string): Record<string, string> => {
  const allowedOrigin = process.env.ALLOWED_ORIGIN ?? '*';
  const requestOrigin = originHeader ?? '';
  const allowOrigin = allowedOrigin === '*' ? '*' : requestOrigin;

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    Vary: 'Origin',
  };
};

export const handler = async (event: HttpEvent): Promise<HttpResponse> => {
  const origin = event.headers?.origin ?? event.headers?.Origin;
  const corsHeaders = buildCorsHeaders(origin);
  const symbol = event.pathParameters?.symbol;

  if (!symbol) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Missing symbol path parameter' }),
    };
  }

  const qs = event.queryStringParameters ?? {};
  const from = qs.from;
  const to = qs.to;
  const period = qs.period ?? 'd';
  const token = qs.api_token ?? 'demo';
  const fmt = qs.fmt ?? 'json';

  if (!from || !to) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Missing required from/to query parameters' }),
    };
  }

  const upstreamUrl = new URL(`https://eodhd.com/api/eod/${encodeURIComponent(symbol)}`);
  upstreamUrl.searchParams.set('from', from);
  upstreamUrl.searchParams.set('to', to);
  upstreamUrl.searchParams.set('period', period);
  upstreamUrl.searchParams.set('api_token', token);
  upstreamUrl.searchParams.set('fmt', fmt);

  try {
    const upstreamResponse = await fetch(upstreamUrl);
    const body = await upstreamResponse.text();

    return {
      statusCode: upstreamResponse.status,
      headers: {
        ...corsHeaders,
        'Content-Type': upstreamResponse.headers.get('content-type') ?? 'application/json',
      },
      body,
    };
  } catch (error) {
    console.error('Proxy request failed', error);
    return {
      statusCode: 502,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to reach upstream provider' }),
    };
  }
};
