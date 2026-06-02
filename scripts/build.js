// -----------------------------------------------------------------------------
// scripts/build.js
// Builds the PRAC marketing site. Fetches vehicle_guides and locations from
// Firestore at build time. Flattens to template-friendly shapes before render.
//
// NOTE: src/data/cars.json and sc/data/locations.json are orphaned dead code
// as of this commit -- the build no longer reads them. They are kept for
// this commit cycle so the previous state can be restored by reverting this
// file. Delete them once the first successful Firestore build is confirmed.
//
// FIRESTORE INDEXES REQUIRED:
// - vehicle_guides (status ASC, displayOrder ASC)
// - locations (status ASC, displayOrder ASC)
// TODO Phase 7: codify these in firestore.indexes.json for reproducibility
// -----------------------------------------------------------------------------

import ejs from 'ejs';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir    = path.join(__dirname, '../src');
const distDir   = path.join(__dirname, '../dist');

// -- Local data files (no CMS pipeline for these) ----------------------------
let site      = fs.readJsonSync(path.join(srcDir, 'data/site.json'));
const languages = fs.readJsonSync(path.join(srcDir, 'data/languages.json'));

// -- Firebase Admin SDK init -------------------------------------------------
const credJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
if (!credJson) {
        throw new Error(
                    'FATAL: GOOGLE_APPLICATION_CREDENTIALS_JSON env var is not set. Build aborted.'
                );
}
const app = initializeApp({ credential: cert(JSON.parse(credJson)) });
const db  = getFirestore(app);

// -- Firestore fetch helpers -------------------------------------------------

async function fetchPublishedGuides(db) {
        const snap = await db.collection('vehicle_guides')
            .where('status', '==', 'published')
            .orderBy('displayOrder')
            .get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function fetchPublishedLocations(db) {
        const snap = await db.collection('locations')
            .where('status', '==', 'published')
            .orderBy('displayOrder')
            .get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
async function fetchPublishedBlogPosts(db) {
    const snap = await db.collection('blog_posts')
        .where('status', '==', 'Published')
        .get();
    const posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    posts.sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
    posts.forEach(p => {
        if (p.coverImage && p.coverImage.startsWith('//')) p.coverImage = 'https:' + p.coverImage;
    });
    return posts;
}

async function fetchFaqs(db) {
        const snap = await db.collection('faqs').get();
        const faqs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        faqs.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        return faqs;
}

async function fetchCompanySettings(db) {
        const snap = await db.collection('app_settings').doc('company').get();
        return snap.exists ? snap.data() : {};
}



async function fetchTypicalPrices() {
  const BASE_URL = 'https://pattaya-rent-a-car-rebuild-700448424476.us-west1.run.app';
  const DAYS = 7;
  const from = new Date();
  from.setDate(from.getDate() + 14);
  const to = new Date(from);
  to.setDate(to.getDate() + DAYS);
  const fromISO = from.toISOString().split('T')[0];
  const toISO = to.toISOString().split('T')[0];
  const classes = ['Budget Economy', 'Budget SUV', 'SUV', 'MPV', 'Pickup Truck', 'Motorbike'];
  const priceMap = {};
  await Promise.all(classes.map(async (cls) => {
    try {
      const url = `${BASE_URL}/api/pricing/quote?class=${encodeURIComponent(cls)}&from=${fromISO}&to=${toISO}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.quotable) {
        priceMap[cls] = { perDay: data.perDay, totalPrice: data.totalPrice, days: DAYS };
      }
    } catch (e) {
      console.warn(`Pricing fetch failed for ${cls}:`, e.message);
    }
  }));
  console.log('Pricing fetched for classes:', Object.keys(priceMap).join(', ') || 'none');
  return priceMap;
}
// Batch-fetch all website_cars docs referenced across guides + locations.
// Returns lookup map: { [docId]: websiteCarObject }
// Single db.getAll() call -- no N+1 queries.
async function fetchFeaturedCarsMap(db, guides, locations) {
        const allIds = new Set();
        [...guides, ...locations].forEach(doc => {
                    (doc.featuredCarIds || []).forEach(id => allIds.add(id));
        });

    if (allIds.size === 0) return {};

    const refs  = [...allIds].map(id => db.collection('website_cars').doc(id));
        const snaps = await db.getAll(...refs);

    const map = {};
        snaps.forEach(snap => {
                    if (snap.exists) map[snap.id] = { id: snap.id, ...snap.data() };
        });
        return map;
}

// -- Schema adapters ---------------------------------------------------------
// Run per-language per-document inside the language loop.
// Templates stay presentational -- they never touch nested Firestore shapes.

function flattenGuide(guide, lang, priceMap = {}) {
        const t = (guide.translations && guide.translations[lang])
            || (guide.translations && guide.translations['en'])
            || {};
        return {
                    ...guide,
                    // Flattened translation fields
                    title:                t.title                || guide.slug,
                    h1:                   t.h1                   || t.title || guide.slug,
                    intro:                t.intro                || '',
                    body:                 t.body                 || '',
                    alternativeRationale: t.alternativeRationale || '',
                    faqs:                 t.faqs                 || [],
                    // Flattened spec fields (from specs.*)
                    seats:        (guide.specs && guide.specs.seats)        || '',
                    transmission: (guide.specs && guide.specs.transmission) || '',
                    fuelType:     (guide.specs && guide.specs.fuelType)     || '',
                    luggage:      (guide.specs && guide.specs.luggage)      || '',
                    features:     (guide.specs && guide.specs.features)     || [],
                    // Images
                    heroImage: guide.heroImage || null,
                    gallery:   guide.gallery   || [],
        };
}

function flattenLocation(loc, lang) {
        const t = (loc.translations && loc.translations[lang])
            || (loc.translations && loc.translations['en'])
            || {};
        return {
                    ...loc,
                    name:         t.name         || loc.slug,
                    h1:           t.h1           || t.name || loc.slug,
                    intro:        t.intro        || '',
                    body:         t.body         || '',
                    deliveryInfo: t.deliveryInfo || '',
                    drivingTips:  t.drivingTips  || '',
                    faqs:         t.faqs         || [],
                    // TRANSITIONAL ALIAS: templates currently access loc.description for prose copy.
                    description:  t.intro        || '',
                    heroImage:    loc.heroImage   || null,
                    mapEmbedUrl:  loc.mapEmbedUrl || '',
                    nearbyAreas:  loc.nearbyAreas || [],
                    metaTitle:    (loc.seo && loc.seo.metaTitle)       || '',
                    metaDescription: (loc.seo && loc.seo.metaDescription) || t.intro || '',
        };
}

// -- Page renderer -----------------------------------------------------------

async function renderPage(templatePath, data, outputPath) {
        const layout = await fs.readFile(path.join(srcDir, 'templates/layout.ejs'), 'utf-8');
        const body   = await fs.readFile(
                    path.join(srcDir, `templates/pages/${templatePath}.ejs`), 'utf-8'
                );

    const renderedBody = ejs.render(body, {
                ...data,
                site,
                languages,
    }, { filename: path.join(srcDir, 'templates/pages/' + templatePath + '.ejs') });

    const fullHtml = ejs.render(layout, {
                ...data,
                site,
                languages,
                body: renderedBody,
                url: outputPath.replace(/index\.html$/, '').replace(/^\.\/dist/, '').replace(/^\.\//, '/')
    }, { filename: path.join(srcDir, 'templates/layout.ejs') });

    await fs.outputFile(path.join(distDir, outputPath), fullHtml);
}

// -- Main build --------------------------------------------------------------

async function build() {
        console.log('Starting build...');
        await fs.remove(distDir);
        await fs.ensureDir(path.join(distDir, 'assets/css'));
        await fs.ensureDir(path.join(distDir, 'assets/js'));
        await fs.ensureDir(path.join(distDir, 'assets/images'));

    await fs.copy(path.join(srcDir, 'assets'), path.join(distDir, 'assets'));
        await fs.outputFile(path.join(distDir, 'favicon.ico'), '');

    // -- Fetch all Firestore data upfront ------------------------------------
    console.log('Fetching from Firestore...');
  const [guides, locations, blogPosts, faqs, company, priceMap] = await Promise.all([
    fetchPublishedGuides(db),
    fetchPublishedLocations(db),
    fetchPublishedBlogPosts(db),
    fetchFaqs(db),
    fetchCompanySettings(db),
    fetchTypicalPrices(),
  ]);
                const carMap = Object.fromEntries(guides.map(g => [g.id, g]));
        site = {
            ...site,                                 // site.json defaults (incl. domain) underneath
            name:    company.companyName || site.name,
            fleetSize: company.fleetSize || site.fleetSize,
            address: company.address || site.address,   // flat string from app_settings
            mapEmbedUrl: company.mapEmbedUrl || '',
            contact: {
                ...site.contact,
                phone:    company.phone    || site.contact?.phone,
                whatsapp: company.whatsapp || site.contact?.whatsapp,
                line:     company.lineId   || site.contact?.line,
                email:    company.email    || site.contact?.email,
            },
            social: {
                ...site.social,
                facebook:  company.social?.facebook  || '',
                instagram: company.social?.instagram || '',
            },
            trust: {
                ...site.trust,
                years:        company.trust?.years        ?? site.trust?.years,
                customers:    company.trust?.customers    || '',
                googleRating: company.trust?.googleRating ?? site.trust?.googleRating,
                googleReviews:company.trust?.googleReviews?? site.trust?.googleReviews,
                facebookRating:  company.trust?.facebookRating  || '',
                facebookReviews: company.trust?.facebookReviews || '',
            },
            openingHours: company.openingHours || null,
        };

    guides.forEach(g => {
                g.featuredCars = (g.featuredCarIds || []).map(id => carMap[id]).filter(Boolean);
    });
        locations.forEach(l => {
                    l.featuredCars = (l.featuredCarIds || []).map(id => carMap[id]).filter(Boolean);
        });

    console.log(guides.length + ' vehicle guides, ' + locations.length + ' locations, ' + Object.keys(carMap).length + ' featured cars, ' + blogPosts.length + ' blog posts');

    for (const langObj of languages.filter(l => l.code === 'en')) {
                const lang    = langObj.code;
                const baseDir = lang === 'en' ? './' : './' + lang + '/';
                const tPath   = (p) => baseDir + p;

                const flatGuides    = guides.map(g => flattenGuide(g, lang));
                const flatLocations = locations.map(l => flattenLocation(l, lang));

            console.log('Building language: ' + lang + '...');

            // Homepage
            await renderPage('home', {
                            lang,
                            featuredGuides:    flatGuides.slice(0, 3),
                            featuredLocations: flatLocations,
                            // TODO Phase 7: source translated titles from site.json or CMS Settings
                            // rather than appending langObj.name as a placeholder suffix
                                            title: lang === 'en' ? 'Car Rental Pattaya | Free Hotel Delivery' : 'Car Rental Pattaya - ' + langObj.name,
                                            description: lang === 'en' ? 'Rent a car in Pattaya from ฿800/day. Free hotel delivery, full insurance included, 4.9★ on Google. Book in 2 minutes — no credit card required.' : 'Easiest car booking in Pattaya. Best service, free delivery to your hotel, and 24/7 support.',
                            schema: {
                                                '@context': 'https://schema.org',
                                                '@graph': [
                                                    {
                                                                                            '@type': ['CarRental', 'LocalBusiness'],
                                                                                    '@id': 'https://' + site.domain + '/#business',
                                                                                                            'alternateName': ['เช่ารถพัทยา', 'Pattaya Car Rental', 'PRAC'],
                                                                    'name': site.name,
                                                                    'url': 'https://' + site.domain + '/' + baseDir.replace(/^\.\//,''),
                                                                    'logo': 'https://' + site.domain + '/assets/images/logo.png',
                                                                    'image': 'https://' + site.domain + '/assets/images/og-image.jpg',
                                                                    'address': {
                                                                                    '@type': 'PostalAddress',
                                                                                    'streetAddress': site.address,
                                                                                    'addressLocality': 'Pattaya',
                                                                                    'addressRegion': 'Chon Buri',
                                                                                    'addressCountry': 'TH'
                                                                    },
                                                                    'telephone': site.contact.phone,
                                                                                            'currenciesAccepted': 'THB',
                                                                    ...(site.trust.googleRating ? { 'aggregateRating': {
                                                                                    '@type': 'AggregateRating',
                                                                                    'ratingValue': site.trust.googleRating,
                                                                                    'reviewCount': site.trust.googleReviews
                                                                    } } : {}),
                                                                    'sameAs': [site.social.facebook, site.social.instagram].filter(Boolean)
                                                                                    'geo': { '@type': 'GeoCoordinates', 'latitude': 12.9274, 'longitude': 100.8834 },
                                                                                'openingHoursSpecification': [{ '@type': 'OpeningHoursSpecification', 'dayOfWeek': ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'], 'opens': '09:30', 'closes': '16:30' }],
                                                                                'priceRange': '฿฿',
                                                    },
                                                    {
                                                                    '@type': 'FAQPage',
                                                                    'mainEntity': [
                                                                            { '@type': 'Question', 'name': 'What is included in the car rental price?', 'acceptedAnswer': { '@type': 'Answer', 'text': 'All rentals include comprehensive insurance, unlimited kilometres, 24/7 roadside support, and free hotel delivery anywhere in Pattaya. There are no hidden fees.' } },
                                                                            { '@type': 'Question', 'name': 'Do I need to pay for the car rental immediately when booking?', 'acceptedAnswer': { '@type': 'Answer', 'text': 'No. You can book now and pay on collection. No credit card is required to browse or reserve your vehicle.' } },
                                                                            { '@type': 'Question', 'name': 'Do I need to pay a deposit for my car rental?', 'acceptedAnswer': { '@type': 'Answer', 'text': 'Yes, a refundable cash deposit of 5,000 THB is required upon vehicle collection. This is fully refunded when you return the car.' } },
                                                                            { '@type': 'Question', 'name': 'What is the cancellation policy for a booking?', 'acceptedAnswer': { '@type': 'Answer', 'text': 'You can cancel free of charge up to 24 hours before your scheduled pickup. No questions asked.' } },
                                                                            { '@type': 'Question', 'name': 'Do you offer free delivery to hotels in Pattaya?', 'acceptedAnswer': { '@type': 'Answer', 'text': 'Yes. We deliver your rental car directly to your hotel or resort anywhere in Pattaya — including Central Pattaya, Jomtien, Naklua, Wongamat, and Pratumnak — at no extra charge.' } },
                                                                            { '@type': 'Question', 'name': 'Can I use a foreign driver licence to rent a car in Thailand?', 'acceptedAnswer': { '@type': 'Answer', 'text': 'Yes, a valid foreign driver licence is accepted. An International Driving Permit (IDP) is recommended but not strictly required for short-term rentals.' } }
                                                                    ]
                                                    }
                                                ]
                            }
            }, tPath('index.html'));

            // Fleet overview -- passes guides array for listing
            await renderPage('cars-index', {
                            lang,
                            guides: flatGuides,
                            title: 'Our Fleet',
                            description: 'Browse our range of rental cars in Pattaya. From economy hatchbacks to luxury SUVs and pickups.',
                            schema: {}
            }, tPath('cars/index.html'));

            // Individual vehicle guide pages
            for (const guide of guides) {
                            const flatGuide = flattenGuide(guide, lang, priceMap);
                            await renderPage('guide-detail', {
                                                lang,
                                                guide: flatGuide,
                                                title: flatGuide.title || flatGuide.make + ' ' + flatGuide.model + ' (' + flatGuide.year + ')',
                                                description: flatGuide.intro || 'Rent a ' + flatGuide.make + ' ' + flatGuide.model + ' in Pattaya.',
                                                schema: {
                                                                        '@context': 'https://schema.org',
                                                                        '@type': 'Vehicle',
                                                                        'name': flatGuide.title || flatGuide.make + ' ' + flatGuide.model,
                                                                        'description': flatGuide.intro || '',
                                                                        'model': flatGuide.model || '',
                                                                        'manufacturer': flatGuide.make || '',
            'vehicleConfiguration': flatGuide.category || '',
            ...(flatGuide.typicalPerDay ? {
              'offers': {
                '@type': 'Offer',
                'priceCurrency': 'THB',
                'price': flatGuide.typicalPerDay,
                'priceValidUntil': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                'description': 'Typical daily rate for a 7-day rental. Prices vary by season and availability.',
                'url': 'https://' + site.domain + '/cars/' + flatGuide.slug + '/'
              }
            } : {})
                                                }
                            }, tPath('cars/' + flatGuide.slug + '/index.html'));
            }

            // Locations overview
            await renderPage('locations-index', {
                            lang,
                            locations: flatLocations,
                            title: 'Our Pickup Locations',
                            description: 'We deliver cars all across Pattaya. Find our coverage areas here.',
                            schema: {}
            }, tPath('locations/index.html'));

            // Individual location pages
            for (const loc of locations) {
                            const flatLoc = flattenLocation(loc, lang);
                            const locUrl = 'https://' + site.domain + '/locations/' + flatLoc.slug + '/';
                            await renderPage('location-detail', {
                                                lang,
                                                loc: flatLoc,
                                                locations,
                                                title: flatLoc.metaTitle || ('Car Rental in ' + flatLoc.name),
                                                description: flatLoc.metaDescription || ('Rent a car in ' + flatLoc.name + ', Pattaya. Free delivery and pickup. Book now for the best rates.'),
                                                schema: {
                                                                        '@context': 'https://schema.org',
                                                                        '@graph': [
                                                                            {
                                                                                            '@type': 'AutoRental',
                                                                                            'name': site.name,
                                                                                            'url': locUrl,
                                                                                            'telephone': site.contact.phone,
                                                                                            'address': {
                                                                                                            '@type': 'PostalAddress',
                                                                                                            'streetAddress': site.address,
                                                                                                            'addressLocality': 'Pattaya',
                                                                                                            'addressRegion': 'Chon Buri',
                                                                                                            'addressCountry': 'TH'
                                                                                            },
                                                                                            'areaServed': flatLoc.name + ', Pattaya, Thailand',
                                                                                            'priceRange': '$',
                                                                                            ...(site.trust.googleRating ? { 'aggregateRating': {
                                                                                                                            '@type': 'AggregateRating',
                                                                                                                            'ratingValue': site.trust.googleRating,
                                                                                                                            'reviewCount': site.trust.googleReviews
                                                                                            } } : {}),
                                                                                            'sameAs': [site.social.facebook, site.social.instagram].filter(Boolean)
                                                                            },
                                                                            ...(flatLoc.faqs && flatLoc.faqs.length ? [{
                                                                                            '@type': 'FAQPage',
                                                                                            'mainEntity': flatLoc.faqs.map(f => ({
                                                                                                                            '@type': 'Question',
                                                                                                                            'name': (f.question || '').trim(),
                                                                                                                            'acceptedAnswer': { '@type': 'Answer', 'text': (f.answer || '').trim() }
                                                                                            }))
                                                                            }] : []),
                                                                            {
                                                                                            '@type': 'BreadcrumbList',
                                                                                            'itemListElement': [
                                                                                                                            { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://' + site.domain + '/' },
                                                                                                                            { '@type': 'ListItem', 'position': 2, 'name': 'Locations', 'item': 'https://' + site.domain + '/locations/' },
                                                                                                                            { '@type': 'ListItem', 'position': 3, 'name': flatLoc.name, 'item': locUrl }
                                                                                            ]
                                                                            }
                                                                        ]
                                                }
                            }, tPath('locations/' + flatLoc.slug + '/index.html'));
            }

            // Static pages
            const pages = ['about', 'contact', 'terms', 'privacy', 'insurance', 'motorbike-rental', 'long-term-rental'];
                for (const page of pages) {
                                await renderPage(page, {
                                                    lang,
                                                    title: page.charAt(0).toUpperCase() + page.slice(1).replace(/-/g, ' '),
                                                    description: 'Learn more about our ' + page + ' for car rentals in Pattaya.',
                                                    schema: {}
                                }, tPath(page + '/index.html'));
                }

                // FAQ page (real data from faqs collection, grouped by category)
                await renderPage('faq', {
                            lang,
                            faqs: faqs,
                            title: 'Frequently Asked Questions',
                            description: 'Everything you need to know about renting a car in Pattaya Ã¢ÂÂ payments, insurance, delivery, requirements and more.',
                            schema: {
                                                '@context': 'https://schema.org',
                                                '@type': 'FAQPage',
                                                'mainEntity': faqs.map(f => ({
                                                                        '@type': 'Question',
                                                                        'name': f.q,
                                                                        'acceptedAnswer': { '@type': 'Answer', 'text': f.a }
                                                }))
                            }
                }, tPath('faq/index.html'));

                // Blog index (paginated, 12 per page)
                const POSTS_PER_PAGE = 12;
                const totalPages = Math.max(1, Math.ceil(blogPosts.length / POSTS_PER_PAGE));
                for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
                    const pagePosts = blogPosts.slice((pageNum - 1) * POSTS_PER_PAGE, pageNum * POSTS_PER_PAGE);
                    const outPath = pageNum === 1 ? tPath('blog/index.html') : tPath('blog/page/' + pageNum + '/index.html');
                    await renderPage('blog', {
                        lang,
                        posts: pagePosts,
                        currentPage: pageNum,
                        totalPages: totalPages,
                        title: pageNum === 1 ? 'Blog' : 'Blog - Page ' + pageNum,
                        description: 'Car and motorbike rental tips, guides, and news from Pattaya Rent A Car.',
                        schema: {}
                    }, outPath);
                }

                // Individual blog post pages
                for (const post of blogPosts) {
                    await renderPage('blog-post', {
                        lang,
                        post,
                        title: post.title,
                        description: post.excerpt || post.title,
                        schema: {
                            '@context': 'https://schema.org',
                            '@type': 'BlogPosting',
                            'headline': post.title,
                            'description': post.excerpt || '',
                            'image': post.coverImage || '',
                            'datePublished': post.publishedAt || '',
                            'dateModified': post.updatedAt || post.publishedAt || '',
                            'author': { '@type': 'Organization', 'name': site.name }
                        }
                    }, tPath('blog/' + post.slug + '/index.html'));
                }
    }

    // -- Sitemap -------------------------------------------------------------
    const sitemapEntries = [
                '/', '/cars/', '/locations/', '/about/', '/contact/', '/faq/',
                '/terms/', '/privacy/', '/insurance/', '/motorbike-rental/', '/long-term-rental/', '/blog/'
            ];

    guides.forEach(g    => sitemapEntries.push('/cars/' + g.slug + '/'));
        locations.forEach(l => sitemapEntries.push('/locations/' + l.slug + '/'));
        blogPosts.forEach(p => sitemapEntries.push('/blog/' + p.slug + '/'));

    const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
                sitemapEntries.map(e => '  <url><loc>https://' + site.domain + e + '</loc></url>').join('\n') +
                '\n</urlset>';

    // TODO Phase 7: emit hreflang variants in sitemap for all languages
    await fs.outputFile(path.join(distDir, 'sitemap.xml'), sitemap);

    const robotsTxt = [
                '# AI / LLM crawlers — explicitly welcomed',
        'User-agent: GPTBot', 'Allow: /', '',
        'User-agent: OAI-SearchBot', 'Allow: /', '',
        'User-agent: ChatGPT-User', 'Allow: /', '',
        'User-agent: Google-Extended', 'Allow: /', '',
        'User-agent: ClaudeBot', 'Allow: /', '',
        'User-agent: Claude-Web', 'Allow: /', '',
        'User-agent: PerplexityBot', 'Allow: /', '',
        'User-agent: Applebot-Extended', 'Allow: /', '',
        '# All other crawlers',
        'User-agent: *', 'Allow: /', '',
        'Sitemap: https://' + site.domain + '/sitemap.xml'
    ].join('\n');
    await fs.outputFile(path.join(distDir, 'robots.txt'), robotsTxt);
  const priceLines = Object.entries(priceMap)
    .map(([cls, p]) => `- ${cls}: from ฿${p.perDay.toLocaleString()}/day (typical ${p.days}-day rental ฿${p.totalPrice.toLocaleString()} total)`)
    .join('\n');

  const llmsTxt = [
    `# ${site.name}`,
    `> ${site.domain}`,
    '',
    `Pattaya's leading car and motorbike rental company, operating since ${(site.trust && site.trust.years) || 2009}. ${site.fleetSize || '100+'} vehicles, free hotel delivery across all Pattaya areas, 24/7 support.`,
    '',
    '## Contact',
    `- Phone/WhatsApp: ${(site.contact && site.contact.phone) || ''}`,
    `- Email: ${(site.contact && site.contact.email) || ''}`,
    `- Line: ${(site.contact && site.contact.line) || ''}`,
    '',
    '## Typical Pricing (7-day rental, indicative — get exact quote at site)',
    priceLines || '- Visit site for current pricing',
    '',
    '## Fleet',
    ...guides.map(g => `- ${g.title}: ${g.seats || ''} seats, ${g.transmission || ''}, ${g.fuelType || ''}`),
    '',
    '## Areas Served',
    ...locations.map(l => `- ${l.name}: ${l.description || ''}`),
    '',
    '## Rental Policy',
    '- No upfront payment — pay on vehicle collection',
    '- 5,000 THB refundable cash deposit required',
    '- Includes first-class insurance, unlimited kilometres, 24hr breakdown cover',
    '- Additional drivers permitted at no extra charge',
    '- Free cancellation at any time',
    '- International or Thai driving licence required',
    '',
    '## Key Pages',
    '- /: Homepage',
    '- /cars/: Full fleet',
    '- /locations/: All service areas',
    '- /faq/: Common questions',
    '- /blog/: Guides and tips',
  ].join('\n');

  await fs.outputFile(path.join(distDir, 'llms.txt'), llmsTxt);

    console.log('Build complete!');
}

build();
// build triggered after Firestore index enable
