import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

/** Shared singleton socket. Reconnection is handled by socket.io itself. */
export function getSocket(): Socket {
  if (!socket) {
    socket = io({ transports: ['websocket', 'polling'] });
  }
  return socket;
}

export function studentSessionKey(roomCode: string) {
  return `classbuzz_student_${roomCode.toUpperCase()}`;
}

export interface StoredStudentSession {
  sessionToken: string;
  name: string;
  participantId: string;
}

export function getStudentSession(roomCode: string): StoredStudentSession | null {
  try {
    return JSON.parse(localStorage.getItem(studentSessionKey(roomCode)) || 'null');
  } catch {
    return null;
  }
}

export function saveStudentSession(roomCode: string, session: StoredStudentSession) {
  localStorage.setItem(studentSessionKey(roomCode), JSON.stringify(session));
}

export function clearStudentSession(roomCode: string) {
  localStorage.removeItem(studentSessionKey(roomCode));
}
