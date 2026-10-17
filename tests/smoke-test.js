/**
 * Live End-to-End Smoke Test Suite
 * Exercises the complete user journey against the live NestJS API (http://localhost:4000)
 * and verifies frontend availability (http://localhost:3000).
 */

const API_BASE = 'http://localhost:4000/api/v1';
const WEB_BASE = 'http://localhost:3000';

async function runSmokeTest() {
  console.log('🚀 Starting Wierd Social Food Evolution E2E Smoke Test...\n');
  const results = [];

  function record(step, success, details) {
    results.push({ step, success, details });
    console.log(`${success ? '✅' : '❌'} [${step}] ${details}`);
    if (!success) {
      console.error(`FAILED: ${step} - ${details}`);
      process.exit(1);
    }
  }

  // 1. Health & Frontend Check
  try {
    const healthRes = await fetch('http://localhost:4000/health');
    const health = await healthRes.json();
    record('API Health Check', health.status === 'ok', `Status: ${health.status}, uptime: ${health.uptime}s`);

    const webRes = await fetch(WEB_BASE);
    record('Frontend Root Load', webRes.status === 200, `Status: ${webRes.status}`);
  } catch (err) {
    record('Initial Connectivity', false, err.message);
  }

  // 2. Register New User
  const randomSuffix = Date.now().toString().slice(-6);
  const testUser = {
    username: `smoke_cook_${randomSuffix}`,
    email: `smoke_${randomSuffix}@hostel.edu`,
    password: 'Password123!',
    displayName: `Smoke Cook ${randomSuffix}`,
  };

  let token = null;
  let userId = null;

  try {
    const regRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });
    const regData = await regRes.json();
    token = regData.accessToken;
    userId = regData.user?.id;
    record('User Registration', regRes.status === 201 && !!token, `Created user @${testUser.username} (${userId})`);
  } catch (err) {
    record('User Registration', false, err.message);
  }

  // 3. User Login & Profile Retrieval
  try {
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password,
      }),
    });
    const loginData = await loginRes.json();
    record('User Login', loginRes.status === 200 && !!loginData.accessToken, `Token re-authenticated successfully`);

    const meRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const meData = await meRes.json();
    record('User Profile (/auth/me)', meRes.status === 200 && meData.id === userId, `Verified profile for @${meData.username}`);
  } catch (err) {
    record('User Authentication Flow', false, err.message);
  }

  // 4. Browse Discover Feed with Sorting & Filtering
  let canonicalIngredient = null;
  try {
    // Canonical ingredients catalog
    const ingRes = await fetch(`${API_BASE}/ingredients?limit=5`);
    const ingData = await ingRes.json();
    canonicalIngredient = ingData.items?.[0];
    record('Canonical Ingredients Query', ingData.items?.length > 0, `Loaded ${ingData.items?.length} ingredients, sample: ${canonicalIngredient?.name}`);

    // Discover feed - Trending mode
    const feedTrending = await fetch(`${API_BASE}/experiments?sort=trending&limit=10`);
    const trendingData = await feedTrending.json();
    record('Discover Feed (Trending)', feedTrending.status === 200, `Found ${trendingData.total} experiments`);

    // Discover feed - Recent mode
    const feedRecent = await fetch(`${API_BASE}/experiments?sort=recent&limit=5`);
    const recentData = await feedRecent.json();
    record('Discover Feed (Recent)', feedRecent.status === 200, `Recent total: ${recentData.total}`);

    // Discover feed - Difficulty filter
    const feedDiff = await fetch(`${API_BASE}/experiments?difficulty=easy`);
    const diffData = await feedDiff.json();
    record('Discover Feed (Difficulty Filter)', feedDiff.status === 200, `Easy recipes: ${diffData.items.length}`);

    // Discover feed - Canonical ingredient filter
    if (canonicalIngredient) {
      const feedIng = await fetch(`${API_BASE}/experiments?canonicalIngredientId=${canonicalIngredient.id}`);
      const ingFilterData = await feedIng.json();
      record('Discover Feed (Ingredient Filter)', feedIng.status === 200, `Filtered by ${canonicalIngredient.name}: ${ingFilterData.items.length} items`);
    }

    // Discover feed - Root only
    const feedRoots = await fetch(`${API_BASE}/experiments?rootOnly=true`);
    const rootsData = await feedRoots.json();
    record('Discover Feed (Root vs Remix Filter)', feedRoots.status === 200, `Root concoctions: ${rootsData.items.length}`);
  } catch (err) {
    record('Discover Feed & Filters', false, err.message);
  }

  // 5. Create a Root Experiment
  let createdExpId = null;
  try {
    const newExperiment = {
      title: `Smoke Test Masala Chai Maggi ${randomSuffix}`,
      description: 'Hostel kettle experiment infusing spiced tea broth into instant noodles.',
      difficulty: 'easy',
      estimatedTimeMinutes: 12,
      estimatedCost: { min: 25, max: 45, currency: 'INR' },
      ingredients: [
        {
          canonicalId: canonicalIngredient?.id,
          name: canonicalIngredient ? canonicalIngredient.name : 'Instant Noodles',
          quantity: 1,
          unit: 'packet',
          preparation: 'Crushed into kettle',
          isOptional: false,
          isCustomAddition: false,
        },
        {
          name: 'Strong Tea Leaves',
          quantity: 1,
          unit: 'tsp',
          preparation: 'Steeped for 2 minutes',
          isOptional: false,
          isCustomAddition: true,
        },
      ],
      steps: [
        {
          stepNumber: 1,
          instruction: 'Boil water with tea leaves until deep amber color emerges.',
          durationMinutes: 3,
        },
        {
          stepNumber: 2,
          instruction: 'Strain liquid, add noodles and tastemaker into boiling spiced liquid.',
          durationMinutes: 5,
        },
      ],
    };

    const createRes = await fetch(`${API_BASE}/experiments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(newExperiment),
    });
    const createData = await createRes.json();
    createdExpId = createData.id;
    record('Experiment Creation', createRes.status === 201 && !!createdExpId, `Created experiment: "${createData.title}" [${createdExpId}]`);
  } catch (err) {
    record('Experiment Creation', false, err.message);
  }

  // 6. Inspect Experiment Details, Lineage, and Tree
  try {
    const detailRes = await fetch(`${API_BASE}/experiments/${createdExpId}`);
    const detailData = await detailRes.json();
    record('Experiment Details View', detailRes.status === 200 && detailData.id === createdExpId, `Title: "${detailData.title}", ingredients: ${detailData.ingredients?.length}`);

    const lineageRes = await fetch(`${API_BASE}/experiments/${createdExpId}/lineage`);
    const lineageData = await lineageRes.json();
    record('Lineage Ancestor Retrieval', lineageRes.status === 200 && lineageData.chainLength >= 1, `Chain length: ${lineageData.chainLength}`);

    const treeRes = await fetch(`${API_BASE}/experiments/${createdExpId}/tree`);
    const treeData = await treeRes.json();
    record('Living Food Graph Tree Retrieval', treeRes.status === 200 && treeData.totalNodes >= 1, `Total tree nodes: ${treeData.totalNodes}`);
  } catch (err) {
    record('Experiment Detail & Graph', false, err.message);
  }

  // 7. Community Voting on Experiment
  try {
    // Cast "would_try" vote
    const voteRes = await fetch(`${API_BASE}/experiments/${createdExpId}/votes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ choice: 'would_try' }),
    });
    const voteData = await voteRes.json();
    record('Cast Vote (would_try)', voteRes.status === 201 && voteData.choice === 'would_try', `Recorded vote choice: ${voteData.choice}`);

    // Summary retrieval
    const summaryRes = await fetch(`${API_BASE}/experiments/${createdExpId}/votes`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const summaryData = await summaryRes.json();
    record('Vote Summary Retrieval', summaryData.wouldTryCount >= 1 && summaryData.userVote === 'would_try', `Would Try: ${summaryData.wouldTryCount}, User Vote: ${summaryData.userVote}`);

    // Change vote to "pass"
    const changeVoteRes = await fetch(`${API_BASE}/experiments/${createdExpId}/votes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ choice: 'pass' }),
    });
    const changeVoteData = await changeVoteRes.json();
    record('Change Vote (pass)', (changeVoteRes.status === 200 || changeVoteRes.status === 201) && changeVoteData.choice === 'pass', `Updated vote to: ${changeVoteData.choice} (HTTP ${changeVoteRes.status})`);
  } catch (err) {
    record('Community Voting', false, err.message);
  }

  // 8. Remix Experiment
  let remixedExpId = null;
  try {
    const remixPayload = {
      title: `[Remix] Elaichi Chai Maggi ${randomSuffix}`,
      description: 'Added crushed green cardamom pods and swapped tea leaves for condensed chai.',
      transformations: [
        {
          type: 'ingredient_added',
          description: 'Added 2 crushed cardamom pods',
          newValue: 'Green Cardamom',
        },
      ],
      ingredients: [
        {
          name: 'Green Cardamom',
          quantity: 2,
          unit: 'pods',
          preparation: 'Lightly crushed',
          isCustomAddition: true,
        },
      ],
      steps: [
        {
          stepNumber: 1,
          instruction: 'Simmer cardamom in chai before infusing noodles.',
        },
      ],
      difficulty: 'medium',
      estimatedCost: { min: 30, max: 55, currency: 'INR' },
      estimatedTimeMinutes: 15,
    };

    const remixRes = await fetch(`${API_BASE}/experiments/${createdExpId}/remix`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(remixPayload),
    });
    const remixData = await remixRes.json();
    remixedExpId = remixData.id;
    record('Remix Experiment Creation', remixRes.status === 201 && remixData.parentId === createdExpId && remixData.branchDepth === 1, `Remixed child [${remixedExpId}] (Gen ${remixData.branchDepth}, parent: ${remixData.parentId})`);
  } catch (err) {
    record('Remix Experiment', false, err.message);
  }

  // 9. Submit Cooking Result (Kitchen Proof)
  let cookingResultId = null;
  try {
    const proofPayload = {
      experimentId: remixedExpId,
      media: [
        {
          id: `media-${Date.now()}`,
          url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80',
          type: 'image',
        },
      ],
      caption: 'Surprisingly aromatic! Cardamom balanced the masala kick.',
      notes: 'Cooked in Havells electric kettle on floor 3 mess.',
      outcomeTag: 'unexpectedly_worked',
      tasteRating: 5,
      textureRating: 4,
      wouldMakeAgain: true,
      modificationsMade: 'Used 3 pods instead of 2',
    };

    const proofRes = await fetch(`${API_BASE}/cooking-results`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(proofPayload),
    });
    const proofData = await proofRes.json();
    cookingResultId = proofData.id;
    record('Cooking Result Submission', proofRes.status === 201 && !!cookingResultId, `Submitted proof [${cookingResultId}] with outcome: ${proofData.outcomeTag}`);

    // List cooking results for this experiment
    const listProofsRes = await fetch(`${API_BASE}/experiments/${remixedExpId}/cooking-results`);
    const listProofsData = await listProofsRes.json();
    record('Cooking Results Listing', listProofsRes.status === 200 && listProofsData.items?.length >= 1, `Retrieved ${listProofsData.items?.length} proof(s) for experiment`);
  } catch (err) {
    record('Cooking Result Flow', false, err.message);
  }

  // 10. Reactions to Cooking Result (fire, yuck, respect, laugh, mind_blown)
  try {
    // Add "fire" reaction
    const reactRes = await fetch(`${API_BASE}/cooking-results/${cookingResultId}/reactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ type: 'fire' }),
    });
    const reactData = await reactRes.json();
    record('Cast Reaction (fire)', reactRes.status === 201 && reactData.type === 'fire', `Reaction recorded: ${reactData.type}`);

    // Get reactions summary
    const summaryRes = await fetch(`${API_BASE}/cooking-results/${cookingResultId}/reactions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const summaryData = await summaryRes.json();
    record('Reaction Summary Retrieval', summaryData.fireCount >= 1 && summaryData.userReaction === 'fire', `Fire count: ${summaryData.fireCount}, User reaction: ${summaryData.userReaction}`);

    // Change reaction to "mind_blown"
    const changeReactRes = await fetch(`${API_BASE}/cooking-results/${cookingResultId}/reactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ type: 'mind_blown' }),
    });
    const changeReactData = await changeReactRes.json();
    record('Change Reaction (mind_blown)', (changeReactRes.status === 200 || changeReactRes.status === 201) && changeReactData.type === 'mind_blown', `Updated reaction to: ${changeReactData.type} (HTTP ${changeReactRes.status})`);

    // Delete reaction
    const delReactRes = await fetch(`${API_BASE}/cooking-results/${cookingResultId}/reactions`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    record('Remove Reaction', delReactRes.status === 200 || delReactRes.status === 204, `Reaction removed successfully`);
  } catch (err) {
    record('Cooking Result Reactions', false, err.message);
  }

  console.log('\n======================================================');
  console.log(`🎉 ALL ${results.length} E2E SMOKE TEST STEPS PASSED SUCCESSFULLY!`);
  console.log('======================================================');
}

runSmokeTest().catch((err) => {
  console.error('Fatal error during smoke test:', err);
  process.exit(1);
});
