/**
 * МУКН | Трафик - Комплексный тест API
 * Тестирует все критические компоненты системы
 */

const BASE_URL = 'http://localhost:3000';

interface TestResult {
  endpoint: string;
  method: string;
  status: 'pass' | 'fail' | 'error';
  statusCode?: number;
  responseTime?: number;
  message?: string;
  data?: any;
}

const results: TestResult[] = [];

async function testEndpoint(
  endpoint: string, 
  method: string = 'GET', 
  body?: any
): Promise<TestResult> {
  const start = Date.now();
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const responseTime = Date.now() - start;
    let data;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    
    return {
      endpoint,
      method,
      status: response.ok ? 'pass' : 'fail',
      statusCode: response.status,
      responseTime,
      message: response.ok ? 'OK' : `HTTP ${response.status}`,
      data,
    };
  } catch (error: any) {
    return {
      endpoint,
      method,
      status: 'error',
      responseTime: Date.now() - start,
      message: error.message,
    };
  }
}

async function runTests() {
  console.log('🚀 МУКН | Трафик - Комплексный тест API\n');
  console.log('=' .repeat(60));
  
  // 1. Health Checks
  console.log('\n📡 1. HEALTH CHECKS');
  console.log('-'.repeat(40));
  
  const healthTests = [
    { endpoint: '/api/health', name: 'Basic Health' },
    { endpoint: '/api/health/check-all', name: 'Full Health Check' },
  ];
  
  for (const test of healthTests) {
    const result = await testEndpoint(test.endpoint);
    console.log(`  ${result.status === 'pass' ? '✅' : '❌'} ${test.name}: ${result.statusCode || 'N/A'} (${result.responseTime}ms)`);
    results.push(result);
  }
  
  // 2. Dashboard API
  console.log('\n📊 2. DASHBOARD API');
  console.log('-'.repeat(40));
  
  const dashboardTests = [
    { endpoint: '/api/dashboard', name: 'Dashboard Main' },
    { endpoint: '/api/dashboard/metrics', name: 'Metrics' },
    { endpoint: '/api/dashboard/kpi', name: 'KPI' },
    { endpoint: '/api/dashboard/chart', name: 'Chart Data' },
    { endpoint: '/api/dashboard/activities', name: 'Activities' },
    { endpoint: '/api/dashboard/events', name: 'Events' },
  ];
  
  for (const test of dashboardTests) {
    const result = await testEndpoint(test.endpoint);
    console.log(`  ${result.status === 'pass' ? '✅' : '❌'} ${test.name}: ${result.statusCode || 'N/A'} (${result.responseTime}ms)`);
    results.push(result);
  }
  
  // 3. Core Data API
  console.log('\n💾 3. CORE DATA API');
  console.log('-'.repeat(40));
  
  const coreTests = [
    { endpoint: '/api/influencers', name: 'Influencers' },
    { endpoint: '/api/accounts', name: 'Accounts' },
    { endpoint: '/api/proxies', name: 'Proxies' },
    { endpoint: '/api/offers', name: 'Offers' },
    { endpoint: '/api/tasks', name: 'Tasks' },
    { endpoint: '/api/campaigns', name: 'Campaigns' },
    { endpoint: '/api/webhooks', name: 'Webhooks' },
    { endpoint: '/api/api-keys', name: 'API Keys' },
    { endpoint: '/api/sim-cards', name: 'SIM Cards' },
  ];
  
  for (const test of coreTests) {
    const result = await testEndpoint(test.endpoint);
    console.log(`  ${result.status === 'pass' ? '✅' : '❌'} ${test.name}: ${result.statusCode || 'N/A'} (${result.responseTime}ms)`);
    results.push(result);
  }
  
  // 4. AI API
  console.log('\n🤖 4. AI API');
  console.log('-'.repeat(40));
  
  const aiGetTests = [
    { endpoint: '/api/ai-providers', name: 'AI Providers' },
    { endpoint: '/api/ai-pool/status', name: 'AI Pool Status' },
    { endpoint: '/api/ai-pool/budget', name: 'AI Pool Budget' },
  ];
  
  for (const test of aiGetTests) {
    const result = await testEndpoint(test.endpoint);
    console.log(`  ${result.status === 'pass' ? '✅' : '❌'} ${test.name}: ${result.statusCode || 'N/A'} (${result.responseTime}ms)`);
    results.push(result);
  }
  
  // AI POST tests
  const aiPostTests = [
    { endpoint: '/api/ai/chat', name: 'AI Chat', body: { messages: [{ role: 'user', content: 'test' }] } },
    { endpoint: '/api/ai/generate', name: 'AI Generate', body: { prompt: 'test', type: 'text' } },
  ];
  
  for (const test of aiPostTests) {
    const result = await testEndpoint(test.endpoint, 'POST', test.body);
    console.log(`  ${result.status === 'pass' ? '✅' : '❌'} ${test.name}: ${result.statusCode || 'N/A'} (${result.responseTime}ms)`);
    results.push(result);
  }
  
  // 5. Content API
  console.log('\n📝 5. CONTENT API');
  console.log('-'.repeat(40));
  
  const contentTests = [
    { endpoint: '/api/content/ideas', name: 'Content Ideas' },
    { endpoint: '/api/content/stories', name: 'Stories' },
    { endpoint: '/api/content/trends', name: 'Trends' },
    { endpoint: '/api/content/poll', name: 'Poll' },
    { endpoint: '/api/content/meme', name: 'Meme' },
    { endpoint: '/api/content/best-time', name: 'Best Time' },
    { endpoint: '/api/content-calendar', name: 'Content Calendar' },
  ];
  
  for (const test of contentTests) {
    const result = await testEndpoint(test.endpoint);
    console.log(`  ${result.status === 'pass' ? '✅' : '❌'} ${test.name}: ${result.statusCode || 'N/A'} (${result.responseTime}ms)`);
    results.push(result);
  }
  
  // 6. Traffic API
  console.log('\n🚦 6. TRAFFIC API');
  console.log('-'.repeat(40));
  
  const trafficTests = [
    { endpoint: '/api/traffic/sources', name: 'Traffic Sources' },
    { endpoint: '/api/traffic/methods', name: 'Traffic Methods' },
    { endpoint: '/api/traffic/analytics', name: 'Traffic Analytics' },
    { endpoint: '/api/traffic/telegram', name: 'Telegram Traffic' },
    { endpoint: '/api/traffic/instagram', name: 'Instagram Traffic' },
    { endpoint: '/api/traffic/tiktok', name: 'TikTok Traffic' },
    { endpoint: '/api/traffic/utm', name: 'UTM Tracking' },
  ];
  
  for (const test of trafficTests) {
    const result = await testEndpoint(test.endpoint);
    console.log(`  ${result.status === 'pass' ? '✅' : '❌'} ${test.name}: ${result.statusCode || 'N/A'} (${result.responseTime}ms)`);
    results.push(result);
  }
  
  // 7. Monetization API
  console.log('\n💰 7. MONETIZATION API');
  console.log('-'.repeat(40));
  
  const monetizationTests = [
    { endpoint: '/api/monetization/partners', name: 'Partners' },
    { endpoint: '/api/monetization/templates', name: 'Templates' },
    { endpoint: '/api/monetization/trends', name: 'Monetization Trends' },
    { endpoint: '/api/monetization/accounts', name: 'Monetization Accounts' },
    { endpoint: '/api/monetization/marketplace', name: 'Marketplace' },
    { endpoint: '/api/monetization/gap-scanner', name: 'Gap Scanner' },
  ];
  
  for (const test of monetizationTests) {
    const result = await testEndpoint(test.endpoint);
    console.log(`  ${result.status === 'pass' ? '✅' : '❌'} ${test.name}: ${result.statusCode || 'N/A'} (${result.responseTime}ms)`);
    results.push(result);
  }
  
  // 8. Hunyuan API
  console.log('\n🎨 8. HUNYUAN API');
  console.log('-'.repeat(40));
  
  const hunyuanTests = [
    { endpoint: '/api/hunyuan/templates', name: 'Hunyuan Templates' },
    { endpoint: '/api/hunyuan/analytics', name: 'Hunyuan Analytics' },
    { endpoint: '/api/hunyuan/schedule', name: 'Hunyuan Schedule' },
  ];
  
  for (const test of hunyuanTests) {
    const result = await testEndpoint(test.endpoint);
    console.log(`  ${result.status === 'pass' ? '✅' : '❌'} ${test.name}: ${result.statusCode || 'N/A'} (${result.responseTime}ms)`);
    results.push(result);
  }
  
  // 9. OFM API
  console.log('\n💎 9. OFM API');
  console.log('-'.repeat(40));
  
  const ofmTests = [
    { endpoint: '/api/ofm/profiles', name: 'OFM Profiles' },
    { endpoint: '/api/ofm/comments', name: 'OFM Comments' },
    { endpoint: '/api/ofm/stories', name: 'OFM Stories' },
    { endpoint: '/api/ofm/prompts', name: 'OFM Prompts' },
    { endpoint: '/api/ofm/advanced', name: 'OFM Advanced' },
  ];
  
  for (const test of ofmTests) {
    const result = await testEndpoint(test.endpoint);
    console.log(`  ${result.status === 'pass' ? '✅' : '❌'} ${test.name}: ${result.statusCode || 'N/A'} (${result.responseTime}ms)`);
    results.push(result);
  }
  
  // 10. Advanced Features API
  console.log('\n⚡ 10. ADVANCED FEATURES API');
  console.log('-'.repeat(40));
  
  const advancedTests = [
    { endpoint: '/api/advanced/load-balancer', name: 'Load Balancer' },
    { endpoint: '/api/advanced/ab-testing', name: 'A/B Testing' },
    { endpoint: '/api/advanced/learning', name: 'Learning Engine' },
    { endpoint: '/api/advanced/cross-post', name: 'Cross Post' },
    { endpoint: '/api/advanced/dynamic-offer', name: 'Dynamic Offer' },
    { endpoint: '/api/advanced/shadow-accounts', name: 'Shadow Accounts' },
    { endpoint: '/api/advanced/forgetfulness', name: 'Forgetfulness' },
    { endpoint: '/api/advanced/antidetect', name: 'Antidetect' },
  ];
  
  for (const test of advancedTests) {
    const result = await testEndpoint(test.endpoint);
    console.log(`  ${result.status === 'pass' ? '✅' : '❌'} ${test.name}: ${result.statusCode || 'N/A'} (${result.responseTime}ms)`);
    results.push(result);
  }
  
  // 11. Security API
  console.log('\n🔒 11. SECURITY API');
  console.log('-'.repeat(40));
  
  const securityTests = [
    { endpoint: '/api/security/rate-limit', name: 'Rate Limiting' },
    { endpoint: '/api/security/rbac', name: 'RBAC' },
  ];
  
  for (const test of securityTests) {
    const result = await testEndpoint(test.endpoint);
    console.log(`  ${result.status === 'pass' ? '✅' : '❌'} ${test.name}: ${result.statusCode || 'N/A'} (${result.responseTime}ms)`);
    results.push(result);
  }
  
  // 12. Reports API
  console.log('\n📈 12. REPORTS API');
  console.log('-'.repeat(40));
  
  const reportsTests = [
    { endpoint: '/api/reports/export/excel', name: 'Excel Export' },
    { endpoint: '/api/reports/export/pdf', name: 'PDF Export' },
    { endpoint: '/api/analytics/revenue', name: 'Revenue Analytics' },
    { endpoint: '/api/analytics/top-channels', name: 'Top Channels' },
  ];
  
  for (const test of reportsTests) {
    const result = await testEndpoint(test.endpoint);
    console.log(`  ${result.status === 'pass' ? '✅' : '❌'} ${test.name}: ${result.statusCode || 'N/A'} (${result.responseTime}ms)`);
    results.push(result);
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const errors = results.filter(r => r.status === 'error').length;
  const total = results.length;
  
  console.log(`\n  ✅ Passed: ${passed}/${total} (${((passed/total)*100).toFixed(1)}%)`);
  console.log(`  ❌ Failed: ${failed}/${total}`);
  console.log(`  ⚠️  Errors: ${errors}/${total}`);
  
  if (failed > 0 || errors > 0) {
    console.log('\n🔴 Failed/Error Tests:');
    results
      .filter(r => r.status !== 'pass')
      .forEach(r => {
        console.log(`  - ${r.method} ${r.endpoint}: ${r.message}`);
      });
  }
  
  console.log('\n' + '='.repeat(60));
  
  return { passed, failed, errors, total, results };
}

// Run tests
runTests().then(summary => {
  process.exit(summary.failed > 0 || summary.errors > 0 ? 1 : 0);
}).catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
