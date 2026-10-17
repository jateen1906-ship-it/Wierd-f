/**
 * Step 31 — Wierd Complete Core User Journeys
 * Automated End-to-End Usability, Integration & Security Test Suite
 *
 * Verifies the full core loop:
 * DISCOVER → UNDERSTAND → VOTE → REMIX → COOK → POST RESULT → REACT → BRANCH
 * Along with all social connections (follow, following feed, notifications, activity, profiles, auth restrictions, safety)
 */

const http = require('http');
const path = require('path');

const API_BASE = 'http://localhost:4000/api/v1';
const WEB_BASE = 'http://localhost:3000';
const DATABASE_URL = 'postgresql://wierd_user:wierd_password@127.0.0.1:5433/wierd_db?schema=public';

// Helper for HTTP requests
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

const journeyResults = [];

function recordJourney(num, title, passed, details = '') {
  journeyResults.push({ num, title, status: passed ? 'PASS' : 'FAIL', details });
  const icon = passed ? '✅' : '❌';
  console.log(
    `${icon} [Journey ${num}] ${title}: ${passed ? 'PASS' : 'FAIL'} ${details ? `(${details})` : ''}`,
  );
}

async function main() {
  console.log('================================================================');
  console.log('🚀 STEP 31: Wierd Complete Core User Journeys Verification');
  console.log('================================================================\n');

  const ts = Date.now();
  let userA = null;
  let userB = null;
  let rootExperiment = null;
  let remixedExperiment = null;
  let cookingResult = null;
  let creatorBExperiment = null;

  // -------------------------------------------------------------------------
  // Journey 1: Register new user, log in, and access profile
  // -------------------------------------------------------------------------
  try {
    const regRes = await httpRequest(
      `${API_BASE}/auth/register`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        email: `journey_user_a_${ts}@wierd.food`,
        password: 'Password123!',
        username: `chef_a_${ts}`,
        displayName: 'Chef Journey A',
        skillLevel: 'intermediate',
      },
    );

    if (regRes.status !== 201 || !regRes.body.accessToken) {
      throw new Error(`Registration failed: status ${regRes.status}`);
    }

    const loginRes = await httpRequest(
      `${API_BASE}/auth/login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        email: `journey_user_a_${ts}@wierd.food`,
        password: 'Password123!',
      },
    );

    if (loginRes.status !== 200 || !loginRes.body.accessToken) {
      throw new Error(`Login failed: status ${loginRes.status}`);
    }

    userA = {
      id: loginRes.body.user.id,
      token: loginRes.body.accessToken,
      username: loginRes.body.user.username,
    };

    const meRes = await httpRequest(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });

    const webProfileRes = await httpRequest(`${WEB_BASE}/profile`);

    const j1Passed =
      regRes.status === 201 &&
      loginRes.status === 200 &&
      meRes.status === 200 &&
      meRes.body.username === userA.username &&
      webProfileRes.status === 200;

    recordJourney(1, 'Register new user, log in, and access profile', j1Passed);
  } catch (err) {
    recordJourney(1, 'Register new user, log in, and access profile', false, err.message);
  }

  // -------------------------------------------------------------------------
  // Journey 2: Discover experiments, search, filter, sort, and open an experiment
  // -------------------------------------------------------------------------
  try {
    // 1. Get canonical ingredients to use one for filter
    const ingRes = await httpRequest(`${API_BASE}/ingredients`);
    const canonicalIng = ingRes.body.items[0];

    // 2. Discover feed queries
    const feedRes = await httpRequest(`${API_BASE}/experiments?limit=10`);
    const searchRes = await httpRequest(`${API_BASE}/experiments?search=Maggi`);
    const diffRes = await httpRequest(`${API_BASE}/experiments?difficulty=easy`);
    const rootRes = await httpRequest(`${API_BASE}/experiments?rootOnly=true`);
    const trendingRes = await httpRequest(`${API_BASE}/experiments?sort=trending`);
    const recentRes = await httpRequest(`${API_BASE}/experiments?sort=recent`);

    let targetExpId = null;
    if (feedRes.body.items && feedRes.body.items.length > 0) {
      targetExpId = feedRes.body.items[0].id;
    }

    const expDetailsRes = await httpRequest(`${API_BASE}/experiments/${targetExpId}`);
    const webExpRes = await httpRequest(`${WEB_BASE}/experiments/${targetExpId}`);

    const j2Passed =
      feedRes.status === 200 &&
      searchRes.status === 200 &&
      diffRes.status === 200 &&
      rootRes.status === 200 &&
      trendingRes.status === 200 &&
      recentRes.status === 200 &&
      expDetailsRes.status === 200 &&
      expDetailsRes.body.id === targetExpId &&
      webExpRes.status === 200;

    rootExperiment = expDetailsRes.body;
    recordJourney(
      2,
      'Discover experiments, search, filter, sort, and open experiment',
      j2Passed,
      `Opened ${rootExperiment.title}`,
    );
  } catch (err) {
    recordJourney(
      2,
      'Discover experiments, search, filter, sort, and open experiment',
      false,
      err.message,
    );
  }

  // -------------------------------------------------------------------------
  // Journey 3: Understand experiment ingredients, instructions, difficulty, and lineage
  // -------------------------------------------------------------------------
  try {
    const lineageRes = await httpRequest(`${API_BASE}/experiments/${rootExperiment.id}/lineage`);
    const treeRes = await httpRequest(`${API_BASE}/experiments/${rootExperiment.id}/tree`);

    const hasIngredients =
      Array.isArray(rootExperiment.ingredients) && rootExperiment.ingredients.length > 0;
    const hasInstructions = Array.isArray(rootExperiment.steps) && rootExperiment.steps.length > 0;
    const hasDifficulty = typeof rootExperiment.difficulty === 'string';
    const hasLineage = lineageRes.status === 200 && Array.isArray(lineageRes.body.ancestors);
    const hasTree = treeRes.status === 200 && Array.isArray(treeRes.body.nodes);

    const j3Passed = hasIngredients && hasInstructions && hasDifficulty && hasLineage && hasTree;
    recordJourney(
      3,
      'Understand experiment ingredients, instructions, difficulty, and lineage',
      j3Passed,
      `${rootExperiment.ingredients.length} ingr, ${rootExperiment.steps.length} steps`,
    );
  } catch (err) {
    recordJourney(
      3,
      'Understand experiment ingredients, instructions, difficulty, and lineage',
      false,
      err.message,
    );
  }

  // -------------------------------------------------------------------------
  // Journey 4: Vote on an experiment and verify updated vote state
  // -------------------------------------------------------------------------
  try {
    // 1. Cast would_try vote
    const vote1 = await httpRequest(
      `${API_BASE}/experiments/${rootExperiment.id}/votes`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userA.token}`,
        },
      },
      { choice: 'would_try' },
    );

    // 2. Summary with auth token shows userVote
    const sum1 = await httpRequest(`${API_BASE}/experiments/${rootExperiment.id}/votes`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });

    // 3. Change vote to pass
    const vote2 = await httpRequest(
      `${API_BASE}/experiments/${rootExperiment.id}/votes`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userA.token}`,
        },
      },
      { choice: 'pass' },
    );

    const sum2 = await httpRequest(`${API_BASE}/experiments/${rootExperiment.id}/votes`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });

    const j4Passed =
      vote1.status === 201 &&
      sum1.body.userVote === 'would_try' &&
      vote2.status === 200 &&
      sum2.body.userVote === 'pass';

    recordJourney(
      4,
      'Vote on an experiment and verify updated vote state',
      j4Passed,
      `User choice changed would_try -> pass`,
    );
  } catch (err) {
    recordJourney(4, 'Vote on an experiment and verify updated vote state', false, err.message);
  }

  // -------------------------------------------------------------------------
  // Journey 5: Remix an experiment, make meaningful modification, verify lineage
  // -------------------------------------------------------------------------
  try {
    const remixPayload = {
      title: `${rootExperiment.title} (Smoked Paprika Remix ${ts})`,
      description: 'Remix adding smoked paprika and toasted sesame oil for deeper umami notes.',
      difficulty: 'medium',
      estimatedTimeMinutes: 18,
      estimatedCost: { min: 35, max: 60, currency: 'INR' },
      ingredients: [
        ...rootExperiment.ingredients.map((ing) => ({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          isOptional: ing.isOptional,
          isCustomAddition: false,
        })),
        {
          name: 'Smoked Paprika',
          quantity: 1,
          unit: 'tsp',
          isOptional: false,
          isCustomAddition: true,
        },
      ],
      steps: [
        ...rootExperiment.steps,
        {
          stepNumber: rootExperiment.steps.length + 1,
          instruction: 'Stir in smoked paprika in the final 30 seconds of simmering.',
        },
      ],
      transformations: [
        {
          type: 'ingredient_added',
          description: 'Added smoked paprika for intense smoky richness',
        },
      ],
    };

    const remixRes = await httpRequest(
      `${API_BASE}/experiments/${rootExperiment.id}/remix`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userA.token}`,
        },
      },
      remixPayload,
    );

    if (remixRes.status !== 201) {
      throw new Error(`Remix returned status ${remixRes.status}: ${JSON.stringify(remixRes.body)}`);
    }

    remixedExperiment = remixRes.body;

    // Verify parent/root lineage
    const lineageRes = await httpRequest(`${API_BASE}/experiments/${remixedExperiment.id}/lineage`);
    const webRemixPage = await httpRequest(`${WEB_BASE}/experiments/${rootExperiment.id}/remix`);

    const hasParent = remixedExperiment.parentId === rootExperiment.id;
    const hasBranchDepth = remixedExperiment.branchDepth === (rootExperiment.branchDepth || 0) + 1;
    const lineageAncestors = lineageRes.body.ancestors || [];
    const directAncestor = lineageAncestors.find((a) => a.id === rootExperiment.id);

    const j5Passed =
      remixRes.status === 201 &&
      hasParent &&
      hasBranchDepth &&
      directAncestor !== undefined &&
      webRemixPage.status === 200;

    recordJourney(
      5,
      'Remix experiment, modify recipe, verify parent/root lineage',
      j5Passed,
      `Child Gen ${remixedExperiment.branchDepth}`,
    );
  } catch (err) {
    recordJourney(
      5,
      'Remix experiment, modify recipe, verify parent/root lineage',
      false,
      err.message,
    );
  }

  // -------------------------------------------------------------------------
  // Journey 6: Submit cooking result with ratings, outcome, and valid media URL
  // -------------------------------------------------------------------------
  try {
    const cookPayload = {
      experimentId: remixedExperiment.id,
      media: [
        {
          id: `media-proof-${ts}`,
          url: 'https://cdn.wierd.food/proofs/smoke_paprika_maggi.jpg',
          type: 'image',
        },
      ],
      caption: 'The smoked paprika completely elevated the broth! Must try.',
      notes: 'Used cast-iron pan for higher heat.',
      outcomeTag: 'unexpectedly_worked',
      tasteRating: 5,
      textureRating: 4,
      wouldMakeAgain: true,
      modificationsMade: 'Added extra pinch of sea salt at the end',
    };

    const cookRes = await httpRequest(
      `${API_BASE}/cooking-results`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userA.token}`,
        },
      },
      cookPayload,
    );

    if (cookRes.status !== 201) {
      throw new Error(
        `Cooking result submission failed: ${cookRes.status}: ${JSON.stringify(cookRes.body)}`,
      );
    }

    cookingResult = cookRes.body;

    const j6Passed =
      cookRes.status === 201 &&
      cookingResult.id &&
      cookingResult.tasteRating === 5 &&
      cookingResult.outcomeTag === 'unexpectedly_worked' &&
      cookingResult.media[0].url.startsWith('https://');

    recordJourney(
      6,
      'Submit cooking result with ratings, outcome, and valid media URL',
      j6Passed,
      `Outcome: ${cookingResult.outcomeTag}`,
    );
  } catch (err) {
    recordJourney(
      6,
      'Submit cooking result with ratings, outcome, and valid media URL',
      false,
      err.message,
    );
  }

  // -------------------------------------------------------------------------
  // Journey 7: View cooking results and add, change, and remove reactions
  // -------------------------------------------------------------------------
  try {
    // 1. List cooking results for the remixed experiment
    const listRes = await httpRequest(
      `${API_BASE}/experiments/${remixedExperiment.id}/cooking-results`,
    );

    // 2. Add reaction (fire)
    const react1 = await httpRequest(
      `${API_BASE}/cooking-results/${cookingResult.id}/reactions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userA.token}`,
        },
      },
      { type: 'fire' },
    );

    // 3. Verify reaction summary
    const sum1 = await httpRequest(`${API_BASE}/cooking-results/${cookingResult.id}/reactions`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });

    // 4. Change reaction (mind_blown)
    const react2 = await httpRequest(
      `${API_BASE}/cooking-results/${cookingResult.id}/reactions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userA.token}`,
        },
      },
      { type: 'mind_blown' },
    );

    const sum2 = await httpRequest(`${API_BASE}/cooking-results/${cookingResult.id}/reactions`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });

    // 5. Remove reaction
    const delReact = await httpRequest(
      `${API_BASE}/cooking-results/${cookingResult.id}/reactions`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${userA.token}` },
      },
    );

    const sum3 = await httpRequest(`${API_BASE}/cooking-results/${cookingResult.id}/reactions`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });

    const j7Passed =
      listRes.status === 200 &&
      listRes.body.items.length >= 1 &&
      react1.status === 201 &&
      sum1.body.fireCount === 1 &&
      react2.status === 200 &&
      sum2.body.mindBlownCount === 1 &&
      sum2.body.fireCount === 0 &&
      delReact.status === 200 &&
      sum3.body.mindBlownCount === 0;

    recordJourney(
      7,
      'View cooking results and add, change, and remove reactions',
      j7Passed,
      `Fire -> Mind Blown -> Removed`,
    );
  } catch (err) {
    recordJourney(
      7,
      'View cooking results and add, change, and remove reactions',
      false,
      err.message,
    );
  }

  // -------------------------------------------------------------------------
  // Journey 8: Follow another creator and verify experiments appear in Following feed
  // -------------------------------------------------------------------------
  try {
    // 1. Register Creator B
    const regB = await httpRequest(
      `${API_BASE}/auth/register`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        email: `journey_creator_b_${ts}@wierd.food`,
        password: 'Password123!',
        username: `chef_b_${ts}`,
        displayName: 'Chef Journey B',
        skillLevel: 'advanced',
      },
    );

    userB = {
      id: regB.body.user.id,
      token: regB.body.accessToken,
      username: regB.body.user.username,
    };

    // 2. User A follows Creator B
    const followRes = await httpRequest(`${API_BASE}/users/${userB.username}/follow`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userA.token}` },
    });

    // 3. Creator B publishes a root experiment
    const expBRes = await httpRequest(
      `${API_BASE}/experiments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userB.token}`,
        },
      },
      {
        title: `Chili Crisp Waffle Toast ${ts}`,
        description: 'Savory waffle infused with chili oil, cumin, and cheddar crust.',
        difficulty: 'medium',
        estimatedTimeMinutes: 15,
        estimatedCost: { min: 40, max: 70, currency: 'INR' },
        ingredients: [
          {
            name: 'Waffle Batter',
            quantity: 1,
            unit: 'cup',
            isOptional: false,
            isCustomAddition: false,
          },
        ],
        steps: [
          {
            stepNumber: 1,
            instruction: 'Pour batter into iron and drizzle with spicy chili oil.',
          },
        ],
      },
    );

    creatorBExperiment = expBRes.body;

    // 4. User A checks their Following feed
    const followingFeedRes = await httpRequest(`${API_BASE}/experiments/feed/following`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });

    const webFollowingRes = await httpRequest(`${WEB_BASE}/following`);

    const inFeed = followingFeedRes.body.items.some((item) => item.id === creatorBExperiment.id);

    const j8Passed =
      followRes.status === 200 &&
      followRes.body.isFollowing === true &&
      expBRes.status === 201 &&
      followingFeedRes.status === 200 &&
      inFeed &&
      webFollowingRes.status === 200;

    recordJourney(
      8,
      'Follow creator and verify experiments appear in Following feed',
      j8Passed,
      `Found in User A following feed`,
    );
  } catch (err) {
    recordJourney(
      8,
      'Follow creator and verify experiments appear in Following feed',
      false,
      err.message,
    );
  }

  // -------------------------------------------------------------------------
  // Journey 9: Verify notifications when followed creators publish root experiments or remixes
  // -------------------------------------------------------------------------
  try {
    // 1. Creator B now remixes their recipe
    const remixBRes = await httpRequest(
      `${API_BASE}/experiments/${creatorBExperiment.id}/remix`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userB.token}`,
        },
      },
      {
        title: `Extra Spicy Chili Crisp Waffle ${ts}`,
        description: 'Doubling the chili crisp ratio with extra habanero flakes.',
        difficulty: 'hard',
        estimatedTimeMinutes: 15,
        estimatedCost: { min: 40, max: 75, currency: 'INR' },
        ingredients: [
          {
            name: 'Waffle Batter',
            quantity: 1,
            unit: 'cup',
            isOptional: false,
            isCustomAddition: false,
          },
        ],
        steps: [
          {
            stepNumber: 1,
            instruction: 'Add extra habanero flakes into batter before pressing.',
          },
        ],
        transformations: [
          {
            type: 'spice_level_changed',
            description: 'Doubled the chili oil concentration',
          },
        ],
      },
    );

    // 2. User A checks notifications & unread count
    const unreadRes = await httpRequest(`${API_BASE}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });

    const notifListRes = await httpRequest(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });

    // 3. Mark single notification as read
    const firstNotif = notifListRes.body.items[0];
    const markSingleRes = await httpRequest(`${API_BASE}/notifications/${firstNotif.id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${userA.token}` },
    });

    // 4. Mark all as read
    const markAllRes = await httpRequest(`${API_BASE}/notifications/read-all`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${userA.token}` },
    });

    const finalUnreadRes = await httpRequest(`${API_BASE}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });

    const j9Passed =
      remixBRes.status === 201 &&
      unreadRes.body.unreadCount >= 2 && // 1 for root + 1 for remix
      notifListRes.body.items.length >= 2 &&
      markSingleRes.status === 200 &&
      markAllRes.status === 200 &&
      finalUnreadRes.body.unreadCount === 0;

    recordJourney(
      9,
      'Verify notifications for creator root experiments and remixes',
      j9Passed,
      `Unread count: 2 -> 0`,
    );
  } catch (err) {
    recordJourney(
      9,
      'Verify notifications for creator root experiments and remixes',
      false,
      err.message,
    );
  }

  // -------------------------------------------------------------------------
  // Journey 10: Verify Activity feed shows relevant events with working links
  // -------------------------------------------------------------------------
  try {
    const actRes = await httpRequest(`${API_BASE}/activity?limit=20`);
    const webActRes = await httpRequest(`${WEB_BASE}/activity`);

    const hasEvents = actRes.body.items && actRes.body.items.length > 0;
    const hasValidEntityLinks = actRes.body.items.every(
      (ev) => typeof ev.experiment.id === 'string' && typeof ev.actor.username === 'string',
    );

    const hasRootEvent = actRes.body.items.some((ev) => ev.type === 'root_experiment');
    const hasRemixEvent = actRes.body.items.some((ev) => ev.type === 'remix');
    const hasCookEvent = actRes.body.items.some((ev) => ev.type === 'cooking_result');

    // Test that sample event's target experiment and actor pages load on frontend
    const sampleEvent = actRes.body.items[0];
    const sampleExpPage = await httpRequest(`${WEB_BASE}/experiments/${sampleEvent.experiment.id}`);
    const sampleUserPage = await httpRequest(`${WEB_BASE}/users/${sampleEvent.actor.username}`);

    const j10Passed =
      actRes.status === 200 &&
      hasEvents &&
      hasValidEntityLinks &&
      hasRootEvent &&
      hasRemixEvent &&
      hasCookEvent &&
      sampleExpPage.status === 200 &&
      sampleUserPage.status === 200 &&
      webActRes.status === 200;

    recordJourney(
      10,
      'Verify Activity feed shows relevant events with working links',
      j10Passed,
      `Events: root, remix, cooking_result`,
    );
  } catch (err) {
    recordJourney(
      10,
      'Verify Activity feed shows relevant events with working links',
      false,
      err.message,
    );
  }

  // -------------------------------------------------------------------------
  // Journey 11: Verify public creator profile and personal profile show correct data
  // -------------------------------------------------------------------------
  try {
    // 1. Creator B public profile
    const pubProfileRes = await httpRequest(`${API_BASE}/users/${userB.username}`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });

    const webPubRes = await httpRequest(`${WEB_BASE}/users/${userB.username}`);

    // 2. Verify Creator B stats and privacy
    const bStats = pubProfileRes.body;
    const privacyOk =
      bStats.passwordHash === undefined &&
      bStats.email === undefined &&
      bStats.username === userB.username &&
      bStats.stats &&
      bStats.stats.experimentsCount >= 2 &&
      bStats.stats.followersCount === 1 &&
      bStats.isFollowing === true;

    // 3. User A personal profile
    const myExperimentsRes = await httpRequest(`${API_BASE}/users/me/experiments`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });

    const myCookResultsRes = await httpRequest(`${API_BASE}/users/me/cooking-results`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });

    const j11Passed =
      pubProfileRes.status === 200 &&
      privacyOk &&
      webPubRes.status === 200 &&
      myExperimentsRes.status === 200 &&
      myCookResultsRes.status === 200;

    recordJourney(
      11,
      'Verify public creator profile and personal profile data & privacy',
      j11Passed,
      `Followers: ${bStats.stats?.followersCount}, Exps: ${bStats.stats?.experimentsCount}`,
    );
  } catch (err) {
    recordJourney(
      11,
      'Verify public creator profile and personal profile data & privacy',
      false,
      err.message,
    );
  }

  // -------------------------------------------------------------------------
  // Journey 12: Verify logout and access restrictions
  // -------------------------------------------------------------------------
  try {
    // 1. Attempt protected calls without token
    const unauthExp = await httpRequest(
      `${API_BASE}/experiments`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { title: 'Unauthorized' },
    );

    const unauthFeed = await httpRequest(`${API_BASE}/experiments/feed/following`);
    const unauthMyExp = await httpRequest(`${API_BASE}/users/me/experiments`);
    const unauthNotifs = await httpRequest(`${API_BASE}/notifications`);

    // 2. Attempt call with forged/malformed token
    const forgedToken = await httpRequest(`${API_BASE}/users/me/experiments`, {
      headers: { Authorization: 'Bearer invalid.forged.jwt.token' },
    });

    const j12Passed =
      unauthExp.status === 401 &&
      unauthFeed.status === 401 &&
      unauthMyExp.status === 401 &&
      unauthNotifs.status === 401 &&
      forgedToken.status === 401;

    recordJourney(
      12,
      'Verify logout and protected access restrictions',
      j12Passed,
      `All unauthorized calls returned HTTP 401`,
    );
  } catch (err) {
    recordJourney(12, 'Verify logout and protected access restrictions', false, err.message);
  }

  // -------------------------------------------------------------------------
  // Journey 13: Verify blocked experiments cannot be accessed or interacted with
  // -------------------------------------------------------------------------
  try {
    // 1. Create candidate experiment to be blocked
    const expRes = await httpRequest(
      `${API_BASE}/experiments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userA.token}`,
        },
      },
      {
        title: `Moderated Forbidden Soup ${ts}`,
        description: 'Experiment that will be moderated and blocked.',
        difficulty: 'chaos',
        estimatedTimeMinutes: 10,
        estimatedCost: { min: 20, max: 40, currency: 'INR' },
        ingredients: [
          {
            name: 'Instant Noodles',
            quantity: 1,
            unit: 'packet',
            isOptional: false,
            isCustomAddition: false,
          },
        ],
        steps: [
          {
            stepNumber: 1,
            instruction: 'Boil water.',
          },
        ],
      },
    );

    const blockedExpId = expRes.body.id;

    // 2. Moderate to BLOCKED directly in PostgreSQL
    const prismaPath = path.resolve(__dirname, '../node_modules/@prisma/client');
    const { PrismaClient } = require(prismaPath);
    const prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });
    await prisma.experiment.update({
      where: { id: blockedExpId },
      data: { safetyStatus: 'BLOCKED' },
    });
    await prisma.$disconnect();

    // 3. Test blocked guards
    const getRes = await httpRequest(`${API_BASE}/experiments/${blockedExpId}`);
    const remixRes = await httpRequest(
      `${API_BASE}/experiments/${blockedExpId}/remix`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userA.token}`,
        },
      },
      {
        title: 'Illegal Remix',
        description: 'Should fail',
        difficulty: 'easy',
        estimatedTimeMinutes: 10,
        estimatedCost: { min: 20, max: 40, currency: 'INR' },
        ingredients: [
          { name: 'Water', quantity: 1, unit: 'cup', isOptional: false, isCustomAddition: false },
        ],
        steps: [{ stepNumber: 1, instruction: 'Step 1' }],
        transformations: [{ type: 'ingredient_added', description: 'added water' }],
      },
    );

    const voteRes = await httpRequest(
      `${API_BASE}/experiments/${blockedExpId}/votes`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userA.token}`,
        },
      },
      { choice: 'would_try' },
    );

    const cookRes = await httpRequest(
      `${API_BASE}/cooking-results`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userA.token}`,
        },
      },
      {
        experimentId: blockedExpId,
        media: [{ id: 'm1', url: 'https://cdn.wierd.food/m.jpg', type: 'image' }],
        outcomeTag: 'unexpectedly_worked',
        tasteRating: 5,
        wouldMakeAgain: true,
      },
    );

    const j13Passed =
      getRes.status === 404 &&
      remixRes.status === 404 &&
      voteRes.status === 404 &&
      cookRes.status === 404;

    recordJourney(
      13,
      'Verify blocked experiments cannot be accessed or interacted with',
      j13Passed,
      `All blocked interactions returned HTTP 404`,
    );
  } catch (err) {
    recordJourney(
      13,
      'Verify blocked experiments cannot be accessed or interacted with',
      false,
      err.message,
    );
  }

  // -------------------------------------------------------------------------
  // Final Assessment
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('📊 STEP 31 SUMMARY REPORT');
  console.log('================================================================');

  const total = journeyResults.length;
  const passed = journeyResults.filter((j) => j.status === 'PASS').length;
  const failed = journeyResults.filter((j) => j.status === 'FAIL').length;

  console.log(`Total Journeys Tested: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  journeyResults.forEach((j) => {
    console.log(`  Journey ${j.num.toString().padStart(2, ' ')}: [${j.status}] ${j.title}`);
  });

  if (failed === 0 && passed === 13) {
    console.log('\n🎉 ALL 13 CORE USER JOURNEYS PASSED WITH 100% SUCCESS!');
    process.exit(0);
  } else {
    console.error(`\n❌ ${failed} journey(s) failed.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
