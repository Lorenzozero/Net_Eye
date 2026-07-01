import { NextRequest } from 'next/server';

// Proxy server-side verso il backend NetworkScope.
// Il token NS_TOKEN è letto SOLO qui (variabile server-side, MAI esposta nel bundle client)
// e iniettato nell'header verso il backend. Il browser parla in same-origin con /api/backend/*.
const BACKEND = process.env.NS_BACKEND_URL || 'http://localhost:8000';
const TOKEN = process.env.NS_TOKEN;

export const dynamic = 'force-dynamic';

async function proxy(req: NextRequest, segments: string[]): Promise<Response> {
    const search = new URL(req.url).search;
    const target = `${BACKEND}/${segments.join('/')}${search}`;

    const headers: Record<string, string> = {};
    const ct = req.headers.get('content-type');
    if (ct) headers['content-type'] = ct;
    if (TOKEN) headers['x-ns-token'] = TOKEN;

    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    try {
        const upstream = await fetch(target, {
            method: req.method,
            headers,
            body: hasBody ? await req.text() : undefined,
            // niente cache: dati in tempo reale
            cache: 'no-store',
        });
        const body = await upstream.text();
        return new Response(body, {
            status: upstream.status,
            headers: { 'content-type': upstream.headers.get('content-type') || 'application/json' },
        });
    } catch {
        return new Response(JSON.stringify({ error: 'backend non raggiungibile' }), {
            status: 502,
            headers: { 'content-type': 'application/json' },
        });
    }
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: Ctx) { return proxy(req, (await ctx.params).path); }
export async function POST(req: NextRequest, ctx: Ctx) { return proxy(req, (await ctx.params).path); }
export async function PATCH(req: NextRequest, ctx: Ctx) { return proxy(req, (await ctx.params).path); }
export async function PUT(req: NextRequest, ctx: Ctx) { return proxy(req, (await ctx.params).path); }
export async function DELETE(req: NextRequest, ctx: Ctx) { return proxy(req, (await ctx.params).path); }
