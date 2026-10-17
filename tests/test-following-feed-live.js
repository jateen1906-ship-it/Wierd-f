async function request(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function run() {
  const base = 'http://localhost:4000/api/v1';

  console.log('1. Checking unauthenticated access to following feed...');
  const unauthRes = await request(`${base}/experiments/feed/following`);
  console.log('Unauthenticated status:', unauthRes.status);
  if (unauthRes.status !== 401) throw new Error('Expected 401 for unauthenticated request');

  console.log('2. Registering fresh test user...');
  const rand = Math.floor(100000 + Math.random() * 900000);
  const regRes = await request(`${base}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: `feed_fan_${rand}`,
      email: `feed_fan_${rand}@hostel.edu`,
      password: 'Password123!',
      displayName: `Feed Fan ${rand}`,
    }),
  });
  console.log('Registered user status:', regRes.status, 'username:', regRes.data.user.username);
  const token = regRes.data.accessToken;
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  console.log('3. Querying following feed when following nobody (empty state)...');
  const emptyFeed = await request(`${base}/experiments/feed/following`, {
    headers: authHeaders,
  });
  console.log('Empty feed status:', emptyFeed.status, 'total:', emptyFeed.data.total, 'items length:', emptyFeed.data.items.length);
  if (emptyFeed.data.total !== 0 || emptyFeed.data.items.length !== 0) {
    throw new Error('Expected 0 items when following nobody');
  }

  console.log('4. Following creator smoke_cook_974751...');
  const followRes = await request(`${base}/users/smoke_cook_974751/follow`, {
    method: 'POST',
    headers: authHeaders,
  });
  console.log('Follow status:', followRes.status, followRes.data);

  console.log('5. Querying following feed after following creator...');
  const populatedFeed = await request(`${base}/experiments/feed/following`, {
    headers: authHeaders,
  });
  console.log('Populated feed status:', populatedFeed.status, 'total:', populatedFeed.data.total);
  if (populatedFeed.data.total < 1) throw new Error('Expected followed creator experiments in feed');
  console.log('First experiment in feed:', populatedFeed.data.items[0].title, 'by', populatedFeed.data.items[0].creator.username);

  console.log('6. Querying following feed with difficulty=easy filter and sorting...');
  const filteredFeed = await request(`${base}/experiments/feed/following?difficulty=easy&sort=recent`, {
    headers: authHeaders,
  });
  console.log('Filtered feed items:', filteredFeed.data.items.length);
  filteredFeed.data.items.forEach((item) => {
    if (item.difficulty !== 'easy') throw new Error(`Expected difficulty easy, got ${item.difficulty}`);
  });

  console.log('7. Testing alias GET /users/me/following-feed...');
  const aliasFeed = await request(`${base}/users/me/following-feed`, {
    headers: authHeaders,
  });
  console.log('Alias feed status:', aliasFeed.status, 'total:', aliasFeed.data.total);
  if (aliasFeed.data.total !== populatedFeed.data.total) throw new Error('Alias feed total mismatch');

  console.log('8. Unfollowing creator and re-verifying feed...');
  await request(`${base}/users/smoke_cook_974751/follow`, {
    method: 'DELETE',
    headers: authHeaders,
  });
  const postUnfollowFeed = await request(`${base}/experiments/feed/following`, {
    headers: authHeaders,
  });
  console.log('Post unfollow feed total:', postUnfollowFeed.data.total);
  if (postUnfollowFeed.data.total !== 0) throw new Error('Expected 0 items after unfollowing');

  console.log('9. Checking frontend /following route status...');
  const webRes = await fetch('http://localhost:3000/following');
  console.log('Frontend /following HTTP status:', webRes.status);
  if (webRes.status !== 200) throw new Error('Expected 200 from Next.js /following');

  console.log('ALL PERSONALIZED FOLLOWING FEED CHECKS PASSED SUCCESSFULLY!');
}

run().catch((e) => {
  console.error('Test failed with error:', e);
  process.exit(1);
});
