import { describe, it, expect, vi } from 'vitest';
import { AIServiceAdapter } from './ai-adapter';

function streamFromString(s: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(s));
      controller.close();
    },
  });
}

describe('AIServiceAdapter v2 stream parsing', () => {
  it('parses v2 SSE frames with data.content', async () => {
    const sse = [
      'data: {"type":"chunk","data":{"content":"Hello "}}\n\n',
      'data: {"type":"chunk","data":{"content":"World"}}\n\n',
      'data: {"type":"end"}\n\n',
    ].join('');

    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(streamFromString(sse), {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    } as any));
    // @ts-ignore
    global.fetch = fetchMock;

    const logger = { info: () => {}, warn: () => {}, error: () => {} } as any;
    const adapter = new AIServiceAdapter({ routingMode: 'backend', apiVersion: 'v2' } as any, logger);
    const chunks: string[] = [];
    for await (const c of adapter['chatStreamWithBackend']?.call(adapter, 'hi')) { // access private via bracket
      chunks.push(c);
    }
    expect(chunks.join('')).toBe('Hello World');
  });
});

