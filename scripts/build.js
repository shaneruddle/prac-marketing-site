import ejs from 'ejs';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, '../src');
const distDir = path.join(__dirname, '../dist');

// Load Data
const site = fs.readJsonSync(path.join(srcDir, 'data/site.json'));
const cars = fs.readJsonSync(path.join(srcDir, 'data/cars.json'));
const locations = fs.readJsonSync(path.join(srcDir, 'data/locations.json'));
const languages = fs.readJsonSync(path.join(srcDir, 'data/languages.json'));

async function renderPage(templatePath, data, outputPath) {
    const layout = await fs.readFile(path.join(srcDir, 'templates/layout.ejs'), 'utf-8');
    const body = await fs.readFile(path.join(srcDir, `templates/pages/${templatePath}.ejs`), 'utf-8');
    
    const renderedBody = ejs.render(body, { ...data, site, cars, locations, languages }, { filename: path.join(srcDir, `templates/pages/${templatePath}.ejs`) });
    const fullHtml = ejs.render(layout, { 
        ...data, 
        site, 
        languages, 
        body: renderedBody,
        url: outputPath.replace(/index\.html$/, '').replace(/^\.\/dist/, '') 
    }, { filename: path.join(srcDir, 'templates/layout.ejs') });

    await fs.outputFile(path.join(distDir, outputPath), fullHtml);
}

async function build() {
    console.log('🚀 Starting build...');
    await fs.remove(distDir);
    await fs.ensureDir(path.join(distDir, 'assets/css'));
    await fs.ensureDir(path.join(distDir, 'assets/js'));
    await fs.ensureDir(path.join(distDir, 'assets/images'));

    // Copy basic assets
    await fs.copy(path.join(srcDir, 'assets'), path.join(distDir, 'assets')).catch(() => {});
    
    // Generate .ico placeholder
    await fs.outputFile(path.join(distDir, 'favicon.ico'), '');

    for (const langObj of languages) {
        const lang = langObj.code;
        const baseDir = lang === 'en' ? '' : lang + '/';
        const tPath = (p) => baseDir + p;

        console.log(`Building language: ${lang}...`);

        // Homepage
        await renderPage('home', {
            lang,
            title: lang === 'en' ? 'Pattaya Car Rental' : 'Car Rental Pattaya - ' + langObj.name,
            description: 'Easiest car booking in Pattaya. Best service, free delivery to your hotel, and 24/7 support. Book your car in Pattaya today.',
            schema: {
                "@context": "https://schema.org",
                "@type": "CarRentalBusiness",
                "name": site.name,
                "url": `https://${site.domain}/${baseDir}`,
                "logo": `https://${site.domain}/assets/images/logo.png`,
                "address": site.address,
                "telephone": site.contact.phone
            }
        }, tPath('index.html'));

        // Fleet Overview
        await renderPage('cars-index', {
            lang,
            title: 'Our Fleet',
            description: 'Browse our range of rental cars in Pattaya. From economy hatchbacks to luxury SUVs and pickups.',
            schema: {}
        }, tPath('cars/index.html'));

        // Individual Cars
        for (const car of cars) {
            await renderPage('car-detail', {
                lang, car,
                title: `${car.name} (${car.year})`,
                description: `Rent a ${car.name} in Pattaya. ${car.type} with ${car.seats} seats. ${car.description}`,
                schema: {
                    "@context": "https://schema.org",
                    "@type": "Vehicle",
                    "name": car.name,
                    "description": car.description,
                    "model": car.name,
                    "manufacturer": car.name.split(' ')[0],
                    "vehicleConfiguration": car.type,
                    "numberOfDoors": car.type === 'Sedan' ? 4 : car.type === 'Hatchback' ? 5 : 4
                }
            }, tPath(`cars/${car.slug}/index.html`));
        }

        // Locations Overview
        await renderPage('locations-index', {
            lang,
            title: 'Our Pickup Locations',
            description: 'We deliver cars all across Pattaya. Find our coverage areas here.',
            schema: {}
        }, tPath('locations/index.html'));

        // Individual Locations
        for (const loc of locations) {
            await renderPage('location-detail', {
                lang, loc,
                title: `Car Rental in ${loc.name}`,
                description: `Rent a car in ${loc.name}, Pattaya. We offer free delivery and pickup in ${loc.name}. Book now for the best rates.`,
                schema: {
                    "@context": "https://schema.org",
                    "@type": "LocalBusiness",
                    "name": `${site.name} - ${loc.name}`,
                    "areaServed": loc.name
                }
            }, tPath(`locations/${loc.slug}/index.html`));
        }

        // Other main pages
        const pages = ['about', 'contact', 'faq', 'terms', 'privacy', 'insurance', 'motorbike-rental', 'long-term-rental', 'blog'];
        for (const page of pages) {
            await renderPage(page, {
                lang,
                title: page.charAt(0).toUpperCase() + page.slice(1).replace(/-/g, ' '),
                description: `Learn more about our ${page} for car rentals in Pattaya.`,
                schema: {}
            }, tPath(`${page}/index.html`));
        }
    }

    // Static Assets
    // Sitemap Generation
    const sitemapEntries = [
        '/', '/cars/', '/locations/', '/about/', '/contact/', '/faq/', '/terms/', '/privacy/', '/insurance/', '/motorbike-rental/', '/long-term-rental/', '/blog/'
    ];
    cars.forEach(c => sitemapEntries.push(`/cars/${c.slug}/`));
    locations.forEach(l => sitemapEntries.push(`/locations/${l.slug}/`));

    let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    languages.forEach(l => {
        const langPath = l.code === 'en' ? '' : '/' + l.code;
        sitemapEntries.forEach(entry => {
            sitemap += `  <url>\n    <loc>https://${site.domain}${langPath}${entry}</loc>\n    <changefreq>weekly</changefreq>\n  </url>\n`;
        });
    });
    sitemap += '</urlset>';
    await fs.outputFile(path.join(distDir, 'sitemap.xml'), sitemap);

    await fs.outputFile(path.join(distDir, 'robots.txt'), 'User-agent: *\nAllow: /\nSitemap: https://' + site.domain + '/sitemap.xml');
    await fs.outputFile(path.join(distDir, 'llms.txt'), `# ${site.name}\n\nMarketing site for Pattaya's leading car rental business.\n\n## Key Pages\n- /: Homepage\n- /cars: Fleet overview\n- /locations: Service areas`);

    console.log('✅ Build complete!');
}

build();
