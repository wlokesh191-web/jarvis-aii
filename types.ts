
export enum JarvisStatus {
  IDLE = 'IDLE',
  LISTENING = 'LISTENING',
  THINKING = 'THINKING',
  SPEAKING = 'SPEAKING',
  RECONNECTING = 'RECONNECTING',
  ERROR = 'ERROR'
}

export interface LogEntry {
  id: string;
  timestamp: string;
  source: 'SYSTEM' | 'USER' | 'JARVIS';
  message: string;
}

export interface TranscriptionItem {
  text: string;
  type: 'input' | 'output';
}
