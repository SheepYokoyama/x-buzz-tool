export const dynamic = 'force-dynamic';

import { getPostHistory } from '@/lib/api/scheduled-posts';
import { HistoryClient } from './HistoryClient';

export default async function HistoryPage() {
  const posts = await getPostHistory();
  return <HistoryClient posts={posts} />;
}
