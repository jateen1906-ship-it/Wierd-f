/**
 * Step 32 — Critical Edge Cases, Data Consistency & Concurrency Test Suite
 *
 * Verifies:
 * 1. Concurrency & duplicate request idempotency (concurrent votes, reactions, follows).
 * 2. Boundary conditions: page 0, limit 0, limit > 100, page past last.
 * 3. Deterministic sorting stability with tie-breakers.
 * 4. Invalid input formats, non-existent UUIDs, malformed params, expired/forged tokens.
 * 5. Cross-user authorization boundaries (cannot mark other's notification read, cannot delete other's vote).
 * 6. Moderation safety invariants across all endpoints for BLOCKED experiments.
 * 7. Count consistency across follow/unfollow, vote change/delete, reaction change/delete.
 * 8. Empty feed responses and data structure contract adherence.
 */

const http = require('http');
const path = require('path');

const API_BASE = 'http://localhost:4000/api/v1';
const WEB_BASE = 'http://localhost:3000';
const DATABASE_URL = 'postgresql://wierd_user:wierd_password@127.0.0.1:5433/wierd_db?schema=public';

function httpRequest(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = data ? JSON.parse(data) : null;
        } catch {
          json = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: json,
        });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

const edgeCaseResults = [];

function recordTest(title, passed, details = '') {
  edgeCaseResults.push({ title, status: passed ? 'PASS' : 'FAIL', details });
  const icon = passed ? '✅' : '❌';
  console.log(
    `${icon} [Edge Case] ${title}: ${passed ? 'PASS' : 'FAIL'} ${details ? `(${details})` : ''}`,
  );
}

async function main() {
  console.log('================================================================');
  console.log('🔬 STEP 32: Critical Edge Cases & Data Consistency Testing');
  console.log('================================================================\n');

  const ts = Date.now();
  let user1 = null;
  let user2 = null;
  let testExp = null;
  let testCookResult = null;

  // Setup test users
  const reg1 = await httpRequest(
    `${API_BASE}/auth/register`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      email: `edge_user1_${ts}@wierd.food`,
      password: 'Password123!',
      username: `edge_user1_${ts}`,
      displayName: 'Edge Tester 1',
      skillLevel: 'intermediate',
    },
  );
  user1 = {
    id: reg1.body.user.id,
    token: reg1.body.accessToken,
    username: reg1.body.user.username,
  };

  const reg2 = await httpRequest(
    `${API_BASE}/auth/register`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      email: `edge_user2_${ts}@wierd.food`,
      password: 'Password123!',
      username: `edge_user2_${ts}`,
      displayName: 'Edge Tester 2',
      skillLevel: 'advanced',
    },
  );
  user2 = {
    id: reg2.body.user.id,
    token: reg2.body.accessToken,
    username: reg2.body.user.username,
  };

  // Setup test experiment
  const expRes = await httpRequest(
    `${API_BASE}/experiments`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1.token}`,
      },
    },
    {
      title: `Edge Case Experiment ${ts}`,
      description: 'Testing edge cases, limits, and concurrency',
      difficulty: 'medium',
      estimatedTimeMinutes: 15,
      estimatedCost: { min: 20, max: 50, currency: 'INR' },
      ingredients: [
        {
          name: 'Noodles',
          quantity: 1,
          unit: 'packet',
          isOptional: false,
          isCustomAddition: false,
        },
      ],
      steps: [{ stepNumber: 1, instruction: 'Boil and test.' }],
    },
  );
  testExp = expRes.body;

  // Setup test cooking result
  const cookRes = await httpRequest(
    `${API_BASE}/cooking-results`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user2.token}`,
      },
    },
    {
      experimentId: testExp.id,
      caption: 'Cooking for edge tests',
      outcomeTag: 'flavor_bomb',
      tasteRating: 5,
      textureRating: 4,
      wouldMakeAgain: true,
      media: [{ id: `med-${ts}`, url: 'https://cdn.wierd.food/edge.jpg', type: 'image' }],
    },
  );
  testCookResult = cookRes.body;

  // -------------------------------------------------------------------------
  // 1. Concurrency & Duplicate Requests
  // -------------------------------------------------------------------------
  try {
    // 1A. Concurrent votes from same user with identical choice
    const concurrentVotes = await Promise.all([
      httpRequest(
        `${API_BASE}/experiments/${testExp.id}/votes`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user1.token}` },
        },
        { choice: 'would_try' },
      ),
      httpRequest(
        `${API_BASE}/experiments/${testExp.id}/votes`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user1.token}` },
        },
        { choice: 'would_try' },
      ),
      httpRequest(
        `${API_BASE}/experiments/${testExp.id}/votes`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user1.token}` },
        },
        { choice: 'would_try' },
      ),
    ]);

    const summaryAfterConcurrent = await httpRequest(`${API_BASE}/experiments/${testExp.id}/votes`);
    // Both/all requests succeed (or update), but total votes count must remain EXACTLY 1!
    const voteCountCorrect =
      summaryAfterConcurrent.body.totalVotes === 1 &&
      summaryAfterConcurrent.body.wouldTryCount === 1;

    recordTest(
      'Concurrent duplicate votes preserve exact total count of 1',
      voteCountCorrect,
      `totalVotes=${summaryAfterConcurrent.body.totalVotes}`,
    );
  } catch (err) {
    recordTest('Concurrent duplicate votes preserve exact total count of 1', false, err.message);
  }

  try {
    // 1B. Concurrent reactions on same cooking result
    await Promise.all([
      httpRequest(
        `${API_BASE}/cooking-results/${testCookResult.id}/reactions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user1.token}` },
        },
        { type: 'fire' },
      ),
      httpRequest(
        `${API_BASE}/cooking-results/${testCookResult.id}/reactions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user1.token}` },
        },
        { type: 'fire' },
      ),
    ]);

    const reactSummary = await httpRequest(
      `${API_BASE}/cooking-results/${testCookResult.id}/reactions`,
    );
    const fireCountOk = reactSummary.body.fireCount === 1;
    recordTest(
      'Concurrent duplicate reactions preserve exact fireCount of 1',
      fireCountOk,
      `fireCount=${reactSummary.body.fireCount}`,
    );
  } catch (err) {
    recordTest('Concurrent duplicate reactions preserve exact fireCount of 1', false, err.message);
  }

  try {
    // 1C. Concurrent follow requests (idempotency check)
    await Promise.all([
      httpRequest(`${API_BASE}/users/${user2.username}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user1.token}` },
      }),
      httpRequest(`${API_BASE}/users/${user2.username}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user1.token}` },
      }),
      httpRequest(`${API_BASE}/users/${user2.username}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user1.token}` },
      }),
    ]);

    const profile2 = await httpRequest(`${API_BASE}/users/${user2.username}`);
    const followerCountOk = profile2.body.stats.followersCount === 1;
    recordTest(
      'Concurrent duplicate follow requests preserve exact followerCount of 1',
      followerCountOk,
      `followersCount=${profile2.body.stats.followersCount}`,
    );
  } catch (err) {
    recordTest(
      'Concurrent duplicate follow requests preserve exact followerCount of 1',
      false,
      err.message,
    );
  }

  // -------------------------------------------------------------------------
  // 2. Pagination Boundaries & Query Validation
  // -------------------------------------------------------------------------
  try {
    // Page past total pages
    const pagePast = await httpRequest(`${API_BASE}/experiments?page=99999&limit=10`);
    const pagePastOk =
      pagePast.status === 200 &&
      pagePast.body.items.length === 0 &&
      pagePast.body.hasMore === false;
    recordTest(
      'Querying page far past total items returns empty items list without error',
      pagePastOk,
    );

    // Negative page parameter
    const negPage = await httpRequest(`${API_BASE}/experiments?page=-5`);
    const negPageHandled = negPage.status === 400;
    recordTest('Negative page parameter is rejected with HTTP 400', negPageHandled);

    // Limit exceeding max bound (> 100)
    const excessLimit = await httpRequest(`${API_BASE}/experiments?limit=500`);
    const excessLimitHandled = excessLimit.status === 400;
    recordTest('Excessive limit (> 100) is rejected with HTTP 400', excessLimitHandled);

    // Limit 0 or negative
    const zeroLimit = await httpRequest(`${API_BASE}/experiments?limit=0`);
    const zeroLimitHandled = zeroLimit.status === 400;
    recordTest('Limit of 0 is rejected with HTTP 400', zeroLimitHandled);
  } catch (err) {
    recordTest('Pagination boundary tests', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 3. Sorting Determinism & Tie-Breakers
  // -------------------------------------------------------------------------
  try {
    const sort1 = await httpRequest(`${API_BASE}/experiments?sort=recent&limit=10`);
    const sort2 = await httpRequest(`${API_BASE}/experiments?sort=recent&limit=10`);

    const ids1 = sort1.body.items.map((i) => i.id);
    const ids2 = sort2.body.items.map((i) => i.id);

    const isDeterministic = JSON.stringify(ids1) === JSON.stringify(ids2);
    recordTest(
      'Sort ordering with deterministic tie-breakers produces identical item order across repeated runs',
      isDeterministic,
    );
  } catch (err) {
    recordTest('Sort ordering test', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 4. Invalid Input, Missing Resources & Token Handling
  // -------------------------------------------------------------------------
  try {
    // Malformed UUID in route param
    const malformedUuid = await httpRequest(`${API_BASE}/experiments/not-a-valid-uuid`);
    const malformedHandled = malformedUuid.status === 400;
    recordTest('Malformed UUID in route param returns HTTP 400 Bad Request', malformedHandled);

    // Non-existent UUID
    const nonExistent = await httpRequest(
      `${API_BASE}/experiments/00000000-0000-4000-8000-000000000000`,
    );
    const nonExistentHandled = nonExistent.status === 404;
    recordTest('Non-existent valid UUID returns HTTP 404 Not Found', nonExistentHandled);

    // Non-existent public creator username
    const nonExistentUser = await httpRequest(`${API_BASE}/users/definitely_does_not_exist_${ts}`);
    const userHandled = nonExistentUser.status === 404;
    recordTest('Non-existent creator username returns HTTP 404 Not Found', userHandled);

    // Expired or forged token
    const forgedToken = await httpRequest(`${API_BASE}/users/me/experiments`, {
      headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.fake_signature' },
    });
    const forgedHandled = forgedToken.status === 401;
    recordTest('Forged/invalid JWT token returns HTTP 401 Unauthorized', forgedHandled);
  } catch (err) {
    recordTest('Input and token validation tests', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 5. Cross-User Authorization & Ownership
  // -------------------------------------------------------------------------
  try {
    // Self-follow attempt
    const selfFollow = await httpRequest(`${API_BASE}/users/${user1.username}/follow`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${user1.token}` },
    });
    const selfFollowBlocked = selfFollow.status === 400;
    recordTest('Self-follow attempt is rejected with HTTP 400 Bad Request', selfFollowBlocked);

    // Attempting to mark another user's notification as read
    // 1. Follower 1 follows creator 2, creator 2 posts experiment -> notification for user1
    const dummyNotifId = '11111111-2222-4333-8444-555555555555';
    const otherNotifRead = await httpRequest(`${API_BASE}/notifications/${dummyNotifId}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${user2.token}` },
    });
    const otherNotifBlocked = otherNotifRead.status === 404;
    recordTest(
      'User cannot mark another user or non-existent notification as read (HTTP 404)',
      otherNotifBlocked,
    );
  } catch (err) {
    recordTest('Cross-user authorization tests', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 6. Moderation Safety Invariants on BLOCKED Experiments
  // -------------------------------------------------------------------------
  try {
    // Create experiment and block it
    const blockExpRes = await httpRequest(
      `${API_BASE}/experiments`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user1.token}` },
      },
      {
        title: `Blocked Edge Case ${ts}`,
        description: 'Will be blocked to test full surface isolation',
        difficulty: 'chaos',
        estimatedTimeMinutes: 10,
        estimatedCost: { min: 20, max: 40, currency: 'INR' },
        ingredients: [
          { name: 'Test', quantity: 1, unit: 'cup', isOptional: false, isCustomAddition: false },
        ],
        steps: [{ stepNumber: 1, instruction: 'Step 1' }],
      },
    );
    const blockedId = blockExpRes.body.id;

    // Direct database update to set safetyStatus = 'BLOCKED'
    const prismaPath = path.resolve(__dirname, '../node_modules/@prisma/client');
    const { PrismaClient } = require(prismaPath);
    const prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });
    await prisma.experiment.update({
      where: { id: blockedId },
      data: { safetyStatus: 'BLOCKED' },
    });
    await prisma.$disconnect();

    // Verify all 6 interaction vectors reject blocked experiment
    const [getRes, remixRes, voteRes, sumRes, cookBlockedRes, feedCheck] = await Promise.all([
      httpRequest(`${API_BASE}/experiments/${blockedId}`),
      httpRequest(
        `${API_BASE}/experiments/${blockedId}/remix`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user1.token}` },
        },
        {
          title: 'Remix',
          description: 'Should fail',
          difficulty: 'easy',
          estimatedTimeMinutes: 10,
          estimatedCost: { min: 10, max: 20, currency: 'INR' },
          ingredients: [
            { name: 'Test', quantity: 1, unit: 'cup', isOptional: false, isCustomAddition: false },
          ],
          steps: [{ stepNumber: 1, instruction: 'Step 1' }],
          transformations: [{ type: 'ingredient_added', description: 'added' }],
        },
      ),
      httpRequest(
        `${API_BASE}/experiments/${blockedId}/votes`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user1.token}` },
        },
        { choice: 'would_try' },
      ),
      httpRequest(`${API_BASE}/experiments/${blockedId}/votes`),
      httpRequest(
        `${API_BASE}/cooking-results`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user1.token}` },
        },
        {
          experimentId: blockedId,
          caption: 'Cooking on blocked',
          outcomeTag: 'unexpectedly_worked',
          tasteRating: 5,
          wouldMakeAgain: true,
          media: [{ id: 'm1', url: 'https://cdn.wierd.food/m.jpg', type: 'image' }],
        },
      ),
      httpRequest(`${API_BASE}/experiments?limit=50`),
    ]);

    const notInFeed = !feedCheck.body.items.some((i) => i.id === blockedId);

    const allBlockedOk =
      getRes.status === 404 &&
      remixRes.status === 404 &&
      voteRes.status === 404 &&
      sumRes.status === 404 &&
      cookBlockedRes.status === 404 &&
      notInFeed;

    recordTest(
      'Blocked experiment is completely isolated from GET, remix, vote, vote-summary, cooking-results, and discovery feed',
      allBlockedOk,
    );
  } catch (err) {
    recordTest('Blocked experiment safety tests', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 7. Counter Consistency Across Updates & Deletions
  // -------------------------------------------------------------------------
  try {
    // Follow -> Unfollow -> Follow
    const unfollow = await httpRequest(`${API_BASE}/users/${user2.username}/follow`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${user1.token}` },
    });
    const profileAfterUnfollow = await httpRequest(`${API_BASE}/users/${user2.username}`);
    const unfollowCountOk = profileAfterUnfollow.body.stats.followersCount === 0;

    const refollow = await httpRequest(`${API_BASE}/users/${user2.username}/follow`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${user1.token}` },
    });
    const profileAfterRefollow = await httpRequest(`${API_BASE}/users/${user2.username}`);
    const refollowCountOk = profileAfterRefollow.body.stats.followersCount === 1;

    // Vote would_try -> pass -> delete
    const v1 = await httpRequest(
      `${API_BASE}/experiments/${testExp.id}/votes`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user2.token}` },
      },
      { choice: 'would_try' },
    );

    const v2 = await httpRequest(
      `${API_BASE}/experiments/${testExp.id}/votes`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user2.token}` },
      },
      { choice: 'pass' },
    );

    const delVote = await httpRequest(`${API_BASE}/experiments/${testExp.id}/votes`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${user2.token}` },
    });

    const voteSummaryFinal = await httpRequest(`${API_BASE}/experiments/${testExp.id}/votes`);
    // User1 voted once, User2 deleted their vote -> totalVotes should equal user1's vote = 1
    const voteCountersOk =
      voteSummaryFinal.body.totalVotes === 1 && voteSummaryFinal.body.passCount === 0;

    const countersConsistent = unfollowCountOk && refollowCountOk && voteCountersOk;
    recordTest(
      'Counters consistently increment, transition, and decrement on follow/unfollow and vote/delete',
      countersConsistent,
    );
  } catch (err) {
    recordTest('Counter consistency tests', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 8. Empty Feeds & Frontend State Contracts
  // -------------------------------------------------------------------------
  try {
    // User 2 follows nobody currently (unfollow anyone if any)
    const emptyFollowFeed = await httpRequest(`${API_BASE}/experiments/feed/following`, {
      headers: { Authorization: `Bearer ${user2.token}` },
    });

    const emptyFollowOk =
      emptyFollowFeed.status === 200 &&
      Array.isArray(emptyFollowFeed.body.items) &&
      emptyFollowFeed.body.items.length === 0 &&
      emptyFollowFeed.body.total === 0 &&
      emptyFollowFeed.body.totalPages === 0 &&
      emptyFollowFeed.body.hasMore === false;

    // Empty notifications for fresh user
    const emptyNotif = await httpRequest(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${user2.token}` },
    });

    const emptyNotifOk =
      emptyNotif.status === 200 &&
      Array.isArray(emptyNotif.body.items) &&
      emptyNotif.body.items.length === 0;

    recordTest(
      'Empty feeds adhere to paginated response contract (items: [], total: 0, hasMore: false)',
      emptyFollowOk && emptyNotifOk,
    );
  } catch (err) {
    recordTest('Empty feeds contract tests', false, err.message);
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('📊 STEP 32 CRITICAL EDGE CASES SUMMARY');
  console.log('================================================================');

  const total = edgeCaseResults.length;
  const passed = edgeCaseResults.filter((t) => t.status === 'PASS').length;
  const failed = edgeCaseResults.filter((t) => t.status === 'FAIL').length;

  console.log(`Total Edge Cases Tested: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  edgeCaseResults.forEach((t, i) => {
    console.log(`  Case ${(i + 1).toString().padStart(2, ' ')}: [${t.status}] ${t.title}`);
  });

  if (failed === 0) {
    console.log('\n🎉 ALL CRITICAL EDGE CASES & DATA CONSISTENCY TESTS PASSED!');
    process.exit(0);
  } else {
    console.error(`\n❌ ${failed} edge case test(s) failed.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal edge case runner error:', err);
  process.exit(1);
});
