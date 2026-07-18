'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import type { IconSvgElement } from '@hugeicons/react';
import {
  Alert01Icon,
  Award01Icon,
  BalanceScaleIcon,
  BookOpen01Icon,
  ArrowRight01Icon,
  BrainIcon,
  Cancel01Icon,
  Chart01Icon,
  CheckmarkCircle01Icon,
  ComputerVideoIcon,
  Copy01Icon,
  CrownIcon,
  Delete01Icon,
  DiceIcon,
  Download01Icon,
  Exchange01Icon,
  EyeIcon,
  FireIcon,
  Flag01Icon,
  FlashIcon,
  GameController01Icon,
  HandshakeIcon,
  Home01Icon,
  LockIcon,
  Medal01Icon,
  NextIcon,
  Note01Icon,
  Notification01Icon,
  PauseIcon,
  PlayIcon,
  Presentation01Icon,
  RefreshIcon,
  Rocket01Icon,
  Shield01Icon,
  SmartPhone01Icon,
  StarIcon,
  Target01Icon,
  UndoIcon,
  UserQuestion01Icon,
  PrinterIcon,
} from '@hugeicons/core-free-icons';

export type IconName =
  | 'notification'
  | 'home'
  | 'note'
  | 'game'
  | 'chart'
  | 'target'
  | 'book'
  | 'phone'
  | 'handshake'
  | 'flash'
  | 'monitor'
  | 'pause'
  | 'play'
  | 'lock'
  | 'refresh'
  | 'check'
  | 'cancel'
  | 'skip'
  | 'alert'
  | 'projector'
  | 'dice'
  | 'balance'
  | 'delete'
  | 'copy'
  | 'award'
  | 'question'
  | 'presentation'
  | 'download'
  | 'print'
  | 'exchange'
  | 'undo'
  | 'arrow-right'
  | 'eye';

export type TeamIconKey =
  | 'target'
  | 'rocket'
  | 'star'
  | 'fire'
  | 'brain'
  | 'award'
  | 'flash'
  | 'shield'
  | 'flag'
  | 'medal'
  | 'crown'
  | 'game';

const ICONS: Record<IconName, IconSvgElement> = {
  notification: Notification01Icon,
  home: Home01Icon,
  note: Note01Icon,
  game: GameController01Icon,
  chart: Chart01Icon,
  target: Target01Icon,
  book: BookOpen01Icon,
  phone: SmartPhone01Icon,
  handshake: HandshakeIcon,
  flash: FlashIcon,
  monitor: ComputerVideoIcon,
  pause: PauseIcon,
  play: PlayIcon,
  lock: LockIcon,
  refresh: RefreshIcon,
  check: CheckmarkCircle01Icon,
  cancel: Cancel01Icon,
  skip: NextIcon,
  alert: Alert01Icon,
  projector: Presentation01Icon,
  dice: DiceIcon,
  balance: BalanceScaleIcon,
  delete: Delete01Icon,
  copy: Copy01Icon,
  award: Award01Icon,
  question: UserQuestion01Icon,
  presentation: Presentation01Icon,
  download: Download01Icon,
  print: PrinterIcon,
  exchange: Exchange01Icon,
  undo: UndoIcon,
  'arrow-right': ArrowRight01Icon,
  eye: EyeIcon,
};

const TEAM_ICON_MAP: Record<TeamIconKey, IconSvgElement> = {
  target: Target01Icon,
  rocket: Rocket01Icon,
  star: StarIcon,
  fire: FireIcon,
  brain: BrainIcon,
  award: Award01Icon,
  flash: FlashIcon,
  shield: Shield01Icon,
  flag: Flag01Icon,
  medal: Medal01Icon,
  crown: CrownIcon,
  game: GameController01Icon,
};

/** Maps legacy emoji team icons stored in older games to icon keys. */
const LEGACY_TEAM_ICON: Record<string, TeamIconKey> = {
  '🐯': 'target',
  '🦅': 'rocket',
  '🦁': 'crown',
  '🐺': 'shield',
  '🦈': 'flash',
  '🐉': 'fire',
  '🚀': 'rocket',
  '⚡': 'flash',
  '🔥': 'fire',
  '🌟': 'star',
  '🧠': 'brain',
  '🏆': 'award',
};

export const TEAM_ICON_OPTIONS: TeamIconKey[] = [
  'target',
  'rocket',
  'star',
  'fire',
  'brain',
  'award',
  'flash',
  'shield',
  'flag',
  'medal',
  'crown',
  'game',
];

export const DEFAULT_TEAM_ICONS = { A: 'target' as TeamIconKey, B: 'rocket' as TeamIconKey };

export function resolveTeamIconKey(icon: string): TeamIconKey {
  if (icon in TEAM_ICON_MAP) return icon as TeamIconKey;
  if (icon in LEGACY_TEAM_ICON) return LEGACY_TEAM_ICON[icon];
  return 'star';
}

type IconProps = {
  name: IconName;
  size?: number | string;
  className?: string;
  color?: string;
  strokeWidth?: number;
};

export function Icon({ name, size = 24, className, color = 'currentColor', strokeWidth = 1.75 }: IconProps) {
  return (
    <HugeiconsIcon
      icon={ICONS[name]}
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      className={className}
    />
  );
}

type TeamIconProps = {
  icon: string;
  size?: number | string;
  className?: string;
  color?: string;
  strokeWidth?: number;
};

export function TeamIcon({ icon, size = 24, className, color = 'currentColor', strokeWidth = 1.75 }: TeamIconProps) {
  const key = resolveTeamIconKey(icon);
  return (
    <HugeiconsIcon
      icon={TEAM_ICON_MAP[key]}
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      className={className}
    />
  );
}

export function IconLabel({
  icon,
  children,
  size = 18,
  className = '',
}: {
  icon: IconName;
  children: React.ReactNode;
  size?: number;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Icon name={icon} size={size} />
      {children}
    </span>
  );
}

export function TeamIconLabel({
  icon,
  children,
  size = 18,
  className = '',
  color,
}: {
  icon: string;
  children?: React.ReactNode;
  size?: number;
  className?: string;
  color?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <TeamIcon icon={icon} size={size} color={color} />
      {children}
    </span>
  );
}
