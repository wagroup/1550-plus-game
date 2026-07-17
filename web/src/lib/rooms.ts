import { connectDB } from './db';
import { Game, LiveRoom, Report } from './models';
import {
  applyTeacherAction,
  buildReport,
  prunePresence,
  roomToPlain,
  snapshot,
  tickTimers,
  type LiveRoomData,
} from './game';
import { PHASES } from './types';

async function loadRoom(roomCode: string): Promise<LiveRoomData | null> {
  await connectDB();
  const doc = await LiveRoom.findOne({ roomCode: roomCode.toUpperCase() }).lean();
  if (!doc) return null;
  return roomToPlain(doc as unknown as Record<string, unknown>);
}

async function saveRoom(room: LiveRoomData) {
  await connectDB();
  await LiveRoom.replaceOne({ roomCode: room.roomCode }, room, { upsert: true });
}

async function persistEnded(room: LiveRoomData) {
  if (room.phase !== PHASES.ENDED) return;
  const report = buildReport(room);
  await Report.findOneAndUpdate({ id: report.id }, report, { upsert: true });
  await Game.updateOne({ id: room.id }, { $set: { status: 'ended', endedAt: room.endedAt } });
}

export async function getRoomState(
  roomCode: string,
  role: 'teacher' | 'public',
  opts?: { teacherHeartbeat?: boolean; sessionToken?: string }
) {
  const room = await loadRoom(roomCode);
  if (!room) return null;

  let dirty = false;
  if (tickTimers(room)) dirty = true;
  if (prunePresence(room)) dirty = true;

  if (opts?.teacherHeartbeat) {
    room.teacherConnected = true;
    room.teacherLastSeenAt = Date.now();
    dirty = true;
  }
  if (opts?.sessionToken) {
    const p = room.participants.find((x) => x.sessionToken === opts.sessionToken);
    if (p) {
      p.connected = true;
      p.lastSeenAt = Date.now();
      dirty = true;
    }
  }

  if (dirty) await saveRoom(room);
  return snapshot(room, role);
}

export async function runTeacherAction(
  roomCode: string,
  teacherId: string,
  type: string,
  payload?: Record<string, unknown>
) {
  const room = await loadRoom(roomCode);
  if (!room || room.teacherId !== teacherId) {
    return { error: 'Not authorized.', status: 403 };
  }
  tickTimers(room);
  room.teacherConnected = true;
  room.teacherLastSeenAt = Date.now();

  const result = applyTeacherAction(room, type, payload);
  if (result.error) return { error: result.error, status: 400 };

  await saveRoom(room);
  await persistEnded(room);

  return {
    ok: true as const,
    state: snapshot(room, 'teacher'),
    kickedParticipantId: result.kickedParticipantId,
  };
}

export async function runStudentBuzz(roomCode: string, sessionToken: string) {
  await connectDB();
  const code = roomCode.toUpperCase();

  // Load participant first
  const roomDoc = await LiveRoom.findOne({ roomCode: code }).lean();
  if (!roomDoc) return { accepted: false as const, reason: 'invalid' };
  const room = roomToPlain(roomDoc as unknown as Record<string, unknown>);
  tickTimers(room);

  const participant = room.participants.find((p) => p.sessionToken === sessionToken);
  if (!participant?.teamId) return { accepted: false as const, reason: 'not_in_team' };
  if (room.phase !== PHASES.BUZZER_ACTIVE) return { accepted: false as const, reason: 'too_early' };
  if (room.round?.lockedTeams?.includes(participant.teamId)) {
    return { accepted: false as const, reason: 'team_locked' };
  }

  const now = Date.now();
  const buzz = {
    participantId: participant.id,
    participantName: participant.name,
    teamId: participant.teamId,
    at: now,
    responseMs: room.round?.buzzerOpenedAt ? now - room.round.buzzerOpenedAt : null,
  };
  const discussionSeconds = room.settings.discussionSeconds;
  const discussionEndsAt = discussionSeconds > 0 ? now + discussionSeconds * 1000 : null;

  // Atomic claim: only one concurrent buzz wins across serverless instances
  const updated = await LiveRoom.findOneAndUpdate(
    {
      roomCode: code,
      phase: PHASES.BUZZER_ACTIVE,
      'round.buzz': null,
      'round.lockedTeams': { $ne: participant.teamId },
    },
    {
      $set: {
        phase: PHASES.TEAM_BUZZED,
        discussionEndsAt,
        'round.buzz': buzz,
      },
      $push: {
        eventLog: {
          id: `${now}`,
          at: now,
          message: `${room.teams[participant.teamId].name} buzzed first (${participant.name})`,
        },
      },
    },
    { new: true }
  ).lean();

  if (!updated) {
    // Re-check why it failed
    const current = await loadRoom(code);
    if (!current || current.phase !== PHASES.BUZZER_ACTIVE) {
      return { accepted: false as const, reason: 'too_early' };
    }
    if (current.round?.buzz) return { accepted: false as const, reason: 'already_taken' };
    return { accepted: false as const, reason: 'already_taken' };
  }

  return {
    accepted: true as const,
    teamId: participant.teamId,
    state: snapshot(roomToPlain(updated as unknown as Record<string, unknown>), 'public'),
  };
}

export async function runStudentJoin(
  roomCode: string,
  body: { name?: string; teamId?: string | null; sessionToken?: string }
) {
  const room = await loadRoom(roomCode);
  if (!room) return { error: 'Invalid room code.', status: 404 };
  if (room.phase === PHASES.ENDED) return { error: 'This game has ended.', status: 410 };

  tickTimers(room);

  if (body.sessionToken) {
    const existing = room.participants.find((p) => p.sessionToken === body.sessionToken);
    if (existing) {
      existing.connected = true;
      existing.lastSeenAt = Date.now();
      await saveRoom(room);
      return {
        ok: true as const,
        participant: {
          id: existing.id,
          name: existing.name,
          teamId: existing.teamId,
          sessionToken: existing.sessionToken,
        },
        state: snapshot(room, 'public'),
      };
    }
  }

  const { addParticipant } = await import('./game');
  const result = addParticipant(room, { name: body.name || '', teamId: body.teamId });
  if (result.error) return { error: result.error, status: 400 };

  await saveRoom(room);
  return {
    ok: true as const,
    participant: {
      id: result.participant!.id,
      name: result.participant!.name,
      teamId: result.participant!.teamId,
      sessionToken: result.participant!.sessionToken,
    },
    state: snapshot(room, 'public'),
  };
}
