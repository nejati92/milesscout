import { useState, useRef, useCallback, useEffect } from 'react'

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

export function useVoice(onResult: (text: string) => void) {
  const [listening, setListening] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const cancelledRef = useRef(false)
  const onResultRef = useRef(onResult)
  useEffect(() => { onResultRef.current = onResult })

  const supported = typeof window !== 'undefined' &&
    'MediaRecorder' in window && 'mediaDevices' in navigator

  const start = useCallback(async () => {
    setError(null)
    cancelledRef.current = false

    let mediaStream: MediaStream
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (e) {
      const name = e instanceof Error ? e.name : ''
      setError(name === 'NotAllowedError' ? 'Microphone permission denied' : 'Could not access microphone')
      return
    }

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'

    const recorder = new MediaRecorder(mediaStream, { mimeType })
    chunksRef.current = []

    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }

    recorder.onstop = async () => {
      mediaStream.getTracks().forEach((t) => t.stop())
      setStream(null)
      setListening(false)

      if (cancelledRef.current) { cancelledRef.current = false; return }

      setTranscribing(true)
      try {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const buffer = await blob.arrayBuffer()
        const audio = toBase64(buffer)
        const res = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio, mimeType }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string }
          setError(body.error === 'transcription_not_configured'
            ? 'Add GROQ_API_KEY to enable voice'
            : 'Transcription failed')
          return
        }
        const { transcript } = await res.json() as { transcript: string }
        if (transcript) onResultRef.current(transcript)
      } catch {
        setError('Network error during transcription')
      } finally {
        setTranscribing(false)
      }
    }

    recorderRef.current = recorder
    recorder.start()
    setStream(mediaStream)
    setListening(true)
  }, [])

  const stop = useCallback(() => {
    recorderRef.current?.stop()
  }, [])

  const cancel = useCallback(() => {
    cancelledRef.current = true
    recorderRef.current?.stop()
  }, [])

  return { listening, transcribing, error, stream, start, stop, cancel, supported }
}
