// scripts/import-locations.mjs
// -----------------------------------------------------------------------------
// Imports location content (from scripts/locations-content.mjs) into the
// Firestore locations collection.
//
// SAFETY MODES (set via MODE env var):
//   dry-run  (default) — prints what WOULD be written. Writes NOTHING.
//   test               — writes ONLY the first location (or LOCATION_SLUG).
//   live               — writes ALL locations. Requires CONFIRM=yes.
//
// Scope: only ever touches the locations collection, by slug, using
// set({ merge: true }) so other fields on each doc are preserved.
//
// Run via the manual GitHub Action (.github/workflows/import-locations.yml).
// -----------------------------------------------------------------------------

// NOTE: firebase-admin is imported dynamically inside the write path only,
// so dry-run validation works with no package install and no credentials.
import { locations } from './locations-content.mjs';

const MODE = (process.env.MODE || 'dry-run').trim();          // dry-run | test | live
const CONFIRM = (process.env.CONFIRM || '').trim();           // must be 'yes' for live
const ONLY_SLUG = (process.env.LOCATION_SLUG || '').trim();   // optional: restrict test/live to one slug

function log(...a) { console.log(...a); }
function line() { log('-'.repeat(70)); }

// -- Build the Firestore document shape from a content entry -----------------
function buildDoc(entry) {
  // Only the fields we intend to manage. merge:true preserves the rest.
  return {
    slug: entry.slug,
    status: 'published',
    displayOrder: entry.displayOrder ?? 0,
    seo: {
      metaTitle: entry.seo?.metaTitle || '',
      metaDescription: entry.seo?.metaDescription || ''
    },
    translations: {
      en: {
        name: entry.en.name,
        h1: entry.en.h1,
        intro: entry.en.intro,
        body: entry.en.body,
        faqs: entry.en.faqs || []
      }
    }
  };
}

// -- Validation: refuse to write malformed content ---------------------------
function validate(entry) {
  const problems = [];
  if (!entry.slug || !/^[a-z0-9-]+$/.test(entry.slug)) problems.push('invalid or missing slug');
  if (!entry.en?.name) problems.push('missing en.name');
  if (!entry.en?.h1) problems.push('missing en.h1');
  if (!entry.en?.intro) problems.push('missing en.intro');
  if (!entry.en?.body || entry.en.body.length < 200) problems.push('body missing or suspiciously short');
  if (!Array.isArray(entry.en?.faqs) || entry.en.faqs.length === 0) problems.push('no faqs');
  (entry.en?.faqs || []).forEach((f, i) => {
    if (!f.question || !f.answer) problems.push(`faq[${i}] missing question/answer`);
  });
  return problems;
}

async function main() {
  line();
  log(`LOCATION IMPORT — mode: ${MODE}${ONLY_SLUG ? ` (slug filter: ${ONLY_SLUG})` : ''}`);
  line();

  // Decide which entries are in scope
  let scope = locations;
  if (MODE === 'test') {
    scope = ONLY_SLUG ? locations.filter(l => l.slug === ONLY_SLUG) : locations.slice(0, 1);
  } else if (MODE === 'live' && ONLY_SLUG) {
    scope = locations.filter(l => l.slug === ONLY_SLUG);
  }

  if (scope.length === 0) {
    log('Nothing in scope. Check LOCATION_SLUG. Aborting.');
    process.exit(1);
  }

  // Validate everything in scope FIRST — abort entirely if any entry is bad
  let anyBad = false;
  for (const entry of scope) {
    const problems = validate(entry);
    if (problems.length) {
      anyBad = true;
      log(`✗ ${entry.slug}: ${problems.join('; ')}`);
    } else {
      log(`✓ ${entry.slug}: valid (body ${entry.en.body.length} chars, ${entry.en.faqs.length} faqs)`);
    }
  }
  if (anyBad) {
    line();
    log('Validation failed for one or more entries. NOTHING written. Fix content and re-run.');
    process.exit(1);
  }

  line();

  // DRY RUN — print and stop
  if (MODE === 'dry-run') {
    for (const entry of scope) {
      const doc = buildDoc(entry);
      log(`WOULD WRITE locations/${entry.slug}:`);
      log(`   status=${doc.status} displayOrder=${doc.displayOrder}`);
      log(`   seo.metaTitle="${doc.seo.metaTitle.slice(0, 50)}..."`);
      log(`   en.name="${doc.translations.en.name}" h1 len=${doc.translations.en.h1.length}`);
      log(`   en.body=${doc.translations.en.body.length} chars, faqs=${doc.translations.en.faqs.length}`);
    }
    line();
    log(`DRY RUN complete. ${scope.length} document(s) would be written. NOTHING was written.`);
    log('To write for real: MODE=test (one doc) or MODE=live CONFIRM=yes (all).');
    return;
  }

  // LIVE requires explicit confirm
  if (MODE === 'live' && CONFIRM !== 'yes') {
    log('MODE=live requires CONFIRM=yes. Aborting — nothing written.');
    process.exit(1);
  }

  // -- Actual write (test or confirmed live) ---------------------------------
  const credJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!credJson) {
    log('FATAL: GOOGLE_APPLICATION_CREDENTIALS_JSON not set. Aborting.');
    process.exit(1);
  }
  const { initializeApp, cert } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  initializeApp({ credential: cert(JSON.parse(credJson)) });
  const db = getFirestore();
  log(`WRITING ${scope.length} document(s) to Firestore (merge:true)...`);
  for (const entry of scope) {
    const doc = buildDoc(entry);
    await db.collection('locations').doc(entry.slug).set(doc, { merge: true });
    log(`   ✓ wrote locations/${entry.slug}`);
  }
  line();
  log(`DONE. ${scope.length} location(s) written. Trigger a site build to publish.`);
}

main().catch(err => { console.error('IMPORT ERROR:', err); process.exit(1); });
