/**
 * @module create-sse-stream
 * @capability Streaming
 * @layer Execution
 *
 * Generic SSE stream utility that polls a data source and sends typed events
 * to the client. Handles SSE headers, interval cleanup on disconnect, and
 * terminal state detection.
 */
import type { Request, Response } from "express";

export interface SSEStreamOptions<TData, TEvent> {
  pollFn: () => Promise<TData | null>;
  intervalMs?: number;
  isTerminal: (data: TData) => boolean;
  mapToEvents: (data: TData, prev: TData | null) => TEvent[];
}

export function createSSEStream<TData, TEvent>(
  req: Request,
  res: Response,
  options: SSEStreamOptions<TData, TEvent>,
): void {
  const { pollFn, intervalMs = 2000, isTerminal, mapToEvents } = options;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const sendEvent = (event: TEvent) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  let prev: TData | null = null;

  const interval = setInterval(async () => {
    try {
      const data = await pollFn();

      if (!data) {
        sendEvent({ type: "error", message: "Not found" } as TEvent);
        clearInterval(interval);
        res.end();
        return;
      }

      const events = mapToEvents(data, prev);
      for (const event of events) {
        sendEvent(event);
      }

      prev = data;

      if (isTerminal(data)) {
        clearInterval(interval);
        res.end();
      }
    } catch {
      clearInterval(interval);
      res.end();
    }
  }, intervalMs);

  req.on("close", () => {
    clearInterval(interval);
  });
}
