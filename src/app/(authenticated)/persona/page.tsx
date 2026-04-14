export const dynamic = 'force-dynamic';

import { Header } from '@/components/layout/Header';
import { PersonaClient } from './PersonaClient';
import { getPersonas } from '@/lib/api/personas';

export default async function PersonaPage() {
  const personas = await getPersonas();

  return (
    <>
      <Header title="ペルソナ" subtitle="投稿のトーン・スタイルを管理" />
      <PersonaClient initialPersonas={personas} />
    </>
  );
}
