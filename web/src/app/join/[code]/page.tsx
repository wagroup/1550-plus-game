'use client';

import { useParams } from 'next/navigation';
import JoinClient from '../JoinClient';

export default function JoinWithCodePage() {
  const params = useParams<{ code: string }>();
  return <JoinClient initialCode={params.code} />;
}
