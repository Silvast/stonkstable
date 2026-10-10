export const mockNewsPayload = [
    {
        date: '2026-10-08T09:15:00+00:00',
        title: 'Apple supplier warns on demand',
        content: 'Long article body that the app does not render.',
        link: 'https://example.com/older',
        symbols: ['AAPL.US'],
        tags: ['SUPPLY CHAIN'],
        sentiment: { polarity: -0.4, neg: 0.2, neu: 0.7, pos: 0.1 }
    },
    {
        date: '2026-10-09T14:30:00+00:00',
        title: 'Apple beats expectations',
        content: 'Another long body.',
        link: 'https://example.com/newest',
        symbols: ['AAPL.US', 'MSFT.US'],
        tags: [],
        sentiment: { polarity: 0.8, neg: 0.0, neu: 0.6, pos: 0.4 }
    },
    {
        date: '2026-10-09T08:00:00+00:00',
        title: 'Apple event scheduled',
        content: 'Unscored body.',
        link: 'https://example.com/middle',
        symbols: ['AAPL.US'],
        tags: []
    }
]

export const mockJsonResponse = (body: unknown, status = 200) =>
    Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
    } as Response)
