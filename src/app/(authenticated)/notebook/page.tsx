export const dynamic = 'force-dynamic';

import { Header } from '@/components/layout/Header';
import { NotebookClient } from '@/components/notebook/NotebookClient';
import { getNotes } from '@/lib/api/notes';

export default async function NotebookPage() {
  const notes = await getNotes();

  return (
    <>
      <Header title="ノート" subtitle="アイデアやノウハウを自由に記録" />
      <NotebookClient initialNotes={notes} />
    </>
  );
}
