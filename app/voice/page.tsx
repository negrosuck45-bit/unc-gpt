'use client';

// This page just renders the shared VoiceChat component, which has the
// correct SSE parsing + streaming logic. The previous inline implementation
// concatenated raw bytes (including `data:` prefixes) into the assistant
// message, so the chat showed corrupted text.
import VoiceChat from '@/components/voice-chat';

export default function VoicePage() {
  return <VoiceChat />;
}
