/**
 * MKronoSphere - Basic Usage Example
 * 
 * This example demonstrates the fundamental usage of MKronoSphere
 * for temporal event logging, synchronization, and broadcasting.
 */

import MKronoSphere from '../src/index';

async function basicUsageExample() {
  console.log('🌕 MKronoSphere - Basic Usage Example\n');

  // Initialize MKronoSphere with basic configuration
  const mkronosphere = new MKronoSphere({
    console: { enabled: true },
    websocket: { enabled: false }
  });

  // Wait for initialization
  await new Promise(resolve => {
    mkronosphere.on('initialized', () => {
      console.log('✓ MKronoSphere initialized successfully\n');
      resolve(true);
    });
  });

  // Example 1: Log different types of temporal events
  console.log('📝 Example 1: Logging Temporal Events');
  console.log('─────────────────────────────────────');

  const humanEvent = mkronosphere.logEvent(
    'human',
    'Morning meditation completed',
    { duration: 30, type: 'vipassana' },
    ['meditation', 'morning', 'spiritual']
  );
  console.log(`✓ Logged human event: ${humanEvent.id}`);

  const cosmicEvent = mkronosphere.logEvent(
    'cosmic',
    'Full moon phase detected',
    { phase: '100%', lunarCycle: 29.5 },
    ['lunar', 'full-moon', 'cosmic']
  );
  console.log(`✓ Logged cosmic event: ${cosmicEvent.id}`);

  const financialEvent = mkronosphere.logEvent(
    'financial',
    'Market opening bell',
    { market: 'NYSE', time: '09:30' },
    ['market', 'opening', 'trading']
  );
  console.log(`✓ Logged financial event: ${financialEvent.id}`);

  const energeticEvent = mkronosphere.logEvent(
    'energetic',
    'Energy clearing ritual',
    { method: 'sage', duration: 15 },
    ['ritual', 'clearing', 'energy']
  );
  console.log(`✓ Logged energetic event: ${energeticEvent.id}`);

  const systemEvent = mkronosphere.logEvent(
    'system',
    'Database backup completed',
    { size: '2.5GB', duration: 300 },
    ['backup', 'database', 'maintenance']
  );
  console.log(`✓ Logged system event: ${systemEvent.id}\n`);

  // Example 2: Add sacred time zones
  console.log('🌌 Example 2: Sacred Time Zones');
  console.log('───────────────────────────────');

  mkronosphere.addSacredTimeZone({
    id: 'personal-ritual',
    name: 'Personal Ritual Time',
    type: 'custom',
    calculation: {
      method: 'cron',
      config: { cron: '0 6 * * *' } // Daily at 6 AM
    },
    tags: ['personal', 'ritual', 'daily'],
    priority: 7,
    active: true
  });
  console.log('✓ Added personal ritual sacred time zone');

  mkronosphere.addSacredTimeZone({
    id: 'sunrise-tokyo',
    name: 'Tokyo Sunrise',
    type: 'sunrise',
    location: {
      latitude: 35.6762,
      longitude: 139.6503,
      timezone: 'Asia/Tokyo'
    },
    tags: ['cosmic', 'sunrise', 'tokyo'],
    priority: 6,
    active: true
  });
  console.log('✓ Added Tokyo sunrise sacred time zone\n');

  // Example 3: Add sync targets
  console.log('⚡ Example 3: Sync Targets');
  console.log('──────────────────────────');

  mkronosphere.addSyncTarget({
    id: 'console-output',
    type: 'system',
    config: {
      name: 'Console Output',
      description: 'Outputs temporal events to console'
    },
    connection: {
      method: 'file'
    },
    active: true
  });
  console.log('✓ Added console output sync target');

  mkronosphere.addSyncTarget({
    id: 'webhook-notification',
    type: 'system',
    config: {
      name: 'Webhook Notifications',
      description: 'Sends notifications via webhook'
    },
    connection: {
      method: 'http',
      url: 'https://api.example.com/webhook'
    },
    active: true
  });
  console.log('✓ Added webhook notification sync target\n');

  // Example 4: Trigger synchronization
  console.log('🔄 Example 4: Synchronization');
  console.log('─────────────────────────────');

  try {
    const syncResults = await mkronosphere.syncAllTargets();
    console.log(`✓ Synchronized ${syncResults.length} targets`);
    
    syncResults.forEach((result: any) => {
      const status = result.success ? '✓' : '✗';
      console.log(`  ${status} ${result.target.id}: ${result.success ? 'Success' : result.error}`);
    });
  } catch (error) {
    console.error('✗ Synchronization failed:', error);
  }
  console.log();

  // Example 5: Broadcasting messages
  console.log('📡 Example 5: Broadcasting');
  console.log('──────────────────────────');

  try {
    const broadcastResults = await mkronosphere.broadcastMessage(
      'System demonstration completed successfully',
      'success'
    );
    
    const successCount = Array.from(broadcastResults.values()).filter(Boolean).length;
    console.log(`✓ Broadcasted message to ${successCount} channels`);
  } catch (error) {
    console.error('✗ Broadcasting failed:', error);
  }
  console.log();

  // Example 6: Query events
  console.log('🔍 Example 6: Event Queries');
  console.log('───────────────────────────');

  const allEvents = mkronosphere.getEvents();
  console.log(`✓ Total events: ${allEvents.length}`);

  const cosmicEvents = mkronosphere.getEvents({ type: 'cosmic' });
  console.log(`✓ Cosmic events: ${cosmicEvents.length}`);

  const recentEvents = mkronosphere.getEvents({ limit: 3 });
  console.log(`✓ Recent events: ${recentEvents.length}`);

  const taggedEvents = mkronosphere.getEvents({ tags: ['ritual'] });
  console.log(`✓ Ritual events: ${taggedEvents.length}\n`);

  // Example 7: System status
  console.log('📊 Example 7: System Status');
  console.log('──────────────────────────');

  const targets = mkronosphere.getSyncTargets();
  console.log(`✓ Sync targets: ${targets.length}`);

  const sacredTimeZones = mkronosphere.getSacredTimeZones();
  console.log(`✓ Sacred time zones: ${sacredTimeZones.length}`);

  const config = mkronosphere.getConfig();
  console.log(`✓ System version: ${config.app.version}`);
  console.log(`✓ Environment: ${config.app.environment}\n`);

  // Cleanup
  console.log('🧹 Cleaning up...');
  await mkronosphere.close();
  console.log('✓ MKronoSphere closed successfully');
  console.log('\n🌕 Basic usage example completed!');
}

// Run the example
if (require.main === module) {
  basicUsageExample().catch(console.error);
}

export default basicUsageExample; 