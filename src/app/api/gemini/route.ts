import { GoogleGenAI } from '@google/genai';

export const runtime = 'edge'; // Optional: Edge for fast response

export async function POST(req: Request) {
  const { prompt, history } = await req.json();

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!,
  });

  const model = 'gemini-2.0-flash';
  const tools = [{ googleSearch: {} }];
  const config = { tools, responseMimeType: 'text/plain' };

  const contents = [
    ...history,
    {
      role: 'user',
      parts: [{ text: prompt }],
    },
  ];

  const stream = await ai.models.generateContentStream({
    model,
    config,
    contents,
  });

  const encoder = new TextEncoder();
  const transformStream = new TransformStream();
  const writer = transformStream.writable.getWriter();

  (async () => {
    for await (const chunk of stream) {
      writer.write(encoder.encode(chunk.text));
    }
    writer.close();
  })();

  return new Response(transformStream.readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}