export const dynamic = 'force-dynamic';

import { getPostHistory } from '@/lib/api/scheduled-posts';
import { getDraftPosts } from '@/lib/api/generated-posts';
import { HistoryClient } from './HistoryClient';

export default async function HistoryPage() {
  const [posts, drafts] = await Promise.all([
    getPostHistory(),
    getDraftPosts(),
  ]);
  return <HistoryClient posts={posts} drafts={drafts} />;
}
