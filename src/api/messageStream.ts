import { Platform } from 'react-native';
import { fetch as expoFetch } from 'expo/fetch';
import { API_BASE_URL } from '../api/client';

export type StreamEvent = { id: number; body: string; is_from_driver: boolean; created_at: string; read_at?: string | null };
type ChunkReader = {
  body: { getReader(): { read(): Promise<{ value?: Uint8Array; done: boolean }> } } | null;
  ok: boolean;
  status: number;
};

const nativeFetch = (input: string, init?: RequestInit) => expoFetch(input, init as Parameters<typeof expoFetch>[1]);
const webFetch = (input: string, init?: RequestInit) => globalThis.fetch(input, init);

export function openMessageStream(
  driverId: string,
  afterId: number,
  headers: Record<string, string>,
  onMessage: (event: StreamEvent) => void,
  onClose: () => void
): { cancel: () => void } {
  let cancelled = false;
  let reader: { read(): Promise<{ value?: Uint8Array; done: boolean }> } | null = null;

  const cancel = () => {
    cancelled = true;
    const ctrl = reader as unknown as { cancel?: () => Promise<void> } | null;
    if (ctrl?.cancel) {
      void ctrl.cancel().catch(() => {});
    }
  };

  const fetcher = Platform.OS === 'web' ? webFetch : nativeFetch;

  (async () => {
    try {
      const response = (await fetcher(
        `${API_BASE_URL}/api/v1/messages/${driverId}/stream?after=${afterId}`,
        { headers, method: 'GET' }
      )) as unknown as ChunkReader;

      if (!response.ok || !response.body) {
        onClose();
        return;
      }

      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (!cancelled) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        buffer = buffer.replace(/\r\n/g, '\n');

        let sep: number;
        while ((sep = buffer.indexOf('\n\n')) !== -1) {
          const block = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);

          const dataLine = block.split('\n').find(line => line.startsWith('data:'));
          if (!dataLine) continue;

          const data = dataLine.slice(5).trim();
          if (!data) continue;

          try {
            const parsed = JSON.parse(data) as StreamEvent;
            if (parsed && typeof parsed.id === 'number' && typeof parsed.body === 'string') {
              onMessage(parsed);
            }
          } catch {
            /* ignore malformed event */
          }
        }
      }
    } catch {
      /* network error below is handled by reconnect */
    } finally {
      if (!cancelled) onClose();
    }
  })();

  return { cancel };
}