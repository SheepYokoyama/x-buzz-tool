export const dynamic = 'force-dynamic';

import { getScheduledPosts } from '@/lib/api/scheduled-posts';
import { ScheduleClient } from './ScheduleClient';

export default async function SchedulePage() {
  const posts = await getScheduledPosts();
  return <ScheduleClient initialPosts={posts} />;
}
