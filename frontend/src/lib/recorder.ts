// Thin React hook around the MediaRecorder API (TZ p.2: "запись голоса должна выполняться
// непосредственно в браузере"). WebM/Opus when the browser supports it, as TZ p.8 allows,
// with server-side conversion to WAV happening later (backend/app/audio/convert.py).
import { useCallback, useRef, useState } from "react";

export type RecorderState = "idle" | "requesting" | "recording" | "recorded" | "error";

const PREFERRED_MIME_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return PREFERRED_MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
}

export interface UseRecorder {
  state: RecorderState;
  error: string | null;
  blob: Blob | null;
  mimeType: string | null;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
}

export function useRecorder(): UseRecorder {
  const [state, setState] = useState<RecorderState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setBlob(null);
    setState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMimeType();
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const finalBlob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setBlob(finalBlob);
        setMimeType(recorder.mimeType || "audio/webm");
        setState("recorded");
        cleanupStream();
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setState("recording");
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      const message =
        name === "NotAllowedError"
          ? "Доступ к микрофону запрещён — разрешите доступ в браузере и попробуйте снова"
          : name === "NotFoundError"
            ? "Микрофон не найден"
            : "Не удалось получить доступ к микрофону";
      setError(message);
      setState("error");
      cleanupStream();
    }
  }, [cleanupStream]);

  const stop = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    cleanupStream();
    chunksRef.current = [];
    setBlob(null);
    setMimeType(null);
    setError(null);
    setState("idle");
  }, [cleanupStream]);

  return { state, error, blob, mimeType, start, stop, reset };
}
