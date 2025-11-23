// AssemblyAI Realtime WebSocket helper (browser)
// NOTE: Realtime websocket authentication in browsers requires including the key
// in the query string. This file implements a best-effort client that streams
// raw PCM 16-bit audio frames base64-encoded to AssemblyAI and receives
// partial and final transcripts. You should test this live with a valid API key.

type PartialCallback = (text: string) => void;
type FinalCallback = (text: string) => void;
type ErrorCallback = (err: any) => void;
type OpenCallback = () => void;

const ASSEMBLYAI_KEY = (process.env.REACT_APP_ASSEMBLYAI_KEY || "").trim();

function floatTo16BitPCM(float32Array: Float32Array) {
  const l = float32Array.length;
  const buffer = new ArrayBuffer(l * 2);
  const view = new DataView(buffer);
  let offset = 0;
  for (let i = 0; i < l; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, float32Array[i]));
    s = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, s, true);
  }
  return buffer;
}

function base64EncodeArrayBuffer(arrayBuffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(arrayBuffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk) as any);
  }
  return btoa(binary);
}

export async function startRealtimeTranscription(opts: {
  onPartial: PartialCallback;
  onFinal: FinalCallback;
  onOpen?: OpenCallback;
  onError?: ErrorCallback;
  sampleRate?: number; // 16000 recommended
}): Promise<{ stop: () => void; cancel: () => void }> {
  if (!ASSEMBLYAI_KEY)
    throw new Error("AssemblyAI key not set in REACT_APP_ASSEMBLYAI_KEY");
  const sampleRate = opts.sampleRate || 16000;
  // assemble websocket URL with auth in query string
  const wsUrl = `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=${sampleRate}&auth=${encodeURIComponent(
    ASSEMBLYAI_KEY
  )}`;
  const ws = new WebSocket(wsUrl);

  let audioCtx: AudioContext | null = null;
  let processor: ScriptProcessorNode | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let stream: MediaStream | null = null;

  ws.onopen = () => {
    if (opts.onOpen) opts.onOpen();
    // send a create transcript request enabling partials
    const req = {
      type: "transcript.create",
      transcript_options: { partial_results: true, punctuate: true },
    } as any;
    try {
      ws.send(JSON.stringify(req));
    } catch (e) {}
  };

  ws.onmessage = (ev) => {
    try {
      const d = JSON.parse(ev.data as string);
      // try several shapes
      if (d.type === "partial_transcript" && d.text) {
        opts.onPartial(d.text);
      } else if (
        (d.type === "transcript" ||
          d.type === "final_transcript" ||
          d.type === "transcript.final") &&
        d.text
      ) {
        opts.onFinal(d.text);
      } else if (d.text && d.is_final) {
        opts.onFinal(d.text);
      } else if (d.text) {
        // treat as partial
        opts.onPartial(d.text);
      }
    } catch (e) {
      // ignore non-json messages
    }
  };

  ws.onerror = (ev) => {
    if (opts.onError) opts.onError(ev);
  };

  ws.onclose = () => {
    // noop
  };

  // start microphone capture
  stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
    sampleRate,
  }) as AudioContext;
  source = audioCtx.createMediaStreamSource(stream);
  // buffer size 4096; channel count 1
  processor = audioCtx.createScriptProcessor(4096, 1, 1);
  source.connect(processor);
  processor.connect(audioCtx.destination);

  processor.onaudioprocess = (e: AudioProcessingEvent) => {
    try {
      const input = e.inputBuffer.getChannelData(0);
      const downsampled = floatTo16BitPCM(input);
      const b64 = base64EncodeArrayBuffer(downsampled);
      const msg = { type: "input_audio_buffer.append", audio: b64 };
      try {
        ws.send(JSON.stringify(msg));
      } catch (e) {}
    } catch (e) {
      // ignore
    }
  };

  function stop() {
    try {
      // commit buffer and request transcript finalization
      ws.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
      ws.send(JSON.stringify({ type: "transcript.commit" }));
    } catch (e) {}
    try {
      if (processor) {
        processor.disconnect();
        processor.onaudioprocess = null;
      }
      if (source) source.disconnect();
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (audioCtx) audioCtx.close();
    } catch (e) {}
  }

  function cancel() {
    try {
      ws.close();
    } catch (e) {}
    try {
      if (processor) processor.disconnect();
      if (source) source.disconnect();
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (audioCtx) audioCtx.close();
    } catch (e) {}
  }

  return { stop, cancel };
}

export default { startRealtimeTranscription };
