import { Header } from '@/components/layout/Header';
import { GenerateClient } from './GenerateClient';
import { getPersonas } from '@/lib/api/personas';

export const dynamic = 'force-dynamic';

export default async function GeneratePage() {
  const personas = await getPersonas();

  return (
    <>
      <Header title="AI投稿生成" subtitle="条件を設定してバズ投稿を自動生成" />
      <GenerateClient initialPersonas={personas} />
    </>
  );
}
