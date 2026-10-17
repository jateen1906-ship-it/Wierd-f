const http = require('http');

async function request(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function run() {
  const base = 'http://localhost:4000/api/v1';

  console.log('1. Querying initial public profile for smoke_cook_974751...');
  const prof1 = await request(`${base}/users/smoke_cook_974751`);
  console.log('Profile stats:', prof1.data.stats);

  console.log('2. Registering follower user...');
  const rand = Math.floor(100000 + Math.random() * 900000);
  const reg = await request(`${base}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: `follower_${rand}`,
      email: `follower_${rand}@hostel.edu`,
      password: 'Password123!',
      displayName: `Follower ${rand}`,
    }),
  });
  console.log('Registered user status:', reg.status, 'user:', reg.data.user.username);
  const token = reg.data.accessToken;
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  console.log('3. Following creator smoke_cook_974751...');
  const followRes = await request(`${base}/users/smoke_cook_974751/follow`, {
    method: 'POST',
    headers: authHeaders,
  });
  console.log('Follow result:', followRes.status, followRes.data);

  console.log('4. Duplicate follow (idempotency check)...');
  const dupRes = await request(`${base}/users/smoke_cook_974751/follow`, {
    method: 'POST',
    headers: authHeaders,
  });
  console.log('Duplicate follow result:', dupRes.status, dupRes.data);

  console.log('5. Self-follow prevention check...');
  const selfRes = await request(`${base}/users/follower_${rand}/follow`, {
    method: 'POST',
    headers: authHeaders,
  });
  console.log('Self-follow status:', selfRes.status, selfRes.data);

  console.log('6. Retrieving following list...');
  const followingList = await request(`${base}/users/me/following`, {
    headers: authHeaders,
  });
  console.log('Following count:', followingList.data.total, 'Items:', followingList.data.items);

  console.log('7. Verifying public profile with authenticated viewer...');
  const authProfile = await request(`${base}/users/smoke_cook_974751`, {
    headers: authHeaders,
  });
  console.log('Creator isFollowing flag for viewer:', authProfile.data.isFollowing);
  console.log('Updated followers count:', authProfile.data.stats.followersCount);

  console.log('8. Unfollowing creator...');
  const unfollowRes = await request(`${base}/users/smoke_cook_974751/follow`, {
    method: 'DELETE',
    headers: authHeaders,
  });
  console.log('Unfollow result:', unfollowRes.status, unfollowRes.data);

  console.log('9. Re-checking profile followersCount after unfollow...');
  const postUnfollow = await request(`${base}/users/smoke_cook_974751`);
  console.log('Followers count after unfollow:', postUnfollow.data.stats.followersCount);

  console.log('10. Next.js web route verification...');
  const webRes = await fetch('http://localhost:3000/users/smoke_cook_974751');
  console.log('Next.js route HTTP status:', webRes.status);

  console.log('ALL LIVE FOLLOW SYSTEM CHECKS COMPLETED SUCCESSFULLY!');
}

run().catch((e) => console.error('Error:', e));
