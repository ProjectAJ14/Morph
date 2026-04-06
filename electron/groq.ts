import Groq from "groq-sdk";
import { BrowserWindow } from "electron";

let client: Groq | null = null;

function getClient(apiKey: string): Groq {
  if (!client || (client as any)._options?.apiKey !== apiKey) {
    client = new Groq({ apiKey });
  }
  return client;
}

export async function streamRewrite(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userText: string,
  window: BrowserWindow
): Promise<string> {
  const groq = getClient(apiKey);

  const stream = await groq.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userText },
    ],
    stream: true,
  });

  let fullResponse = "";

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      fullResponse += content;
      window.webContents.send("groq:stream-chunk", content);
    }
  }

  window.webContents.send("groq:stream-done");
  return fullResponse;
}
