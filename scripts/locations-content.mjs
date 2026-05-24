// scripts/locations-content.mjs
// -----------------------------------------------------------------------------
// Content source for the location import script (scripts/import-locations.mjs).
// Editing content here does NOT change the import logic.
//
// Each entry maps to a Firestore document in the locations collection,
// keyed by slug. The import writes with { merge: true }, so fields NOT
// listed here (createdAt, featuredCarIds, etc.) are left untouched.
//
// body is HTML (matches what the template renders via <%- loc.body %>).
// faqs items use { question, answer } (matches the location schema).
// -----------------------------------------------------------------------------

export const locations = [
  {
    slug: 'naklua',
    displayOrder: 2,
    seo: {
      metaTitle: 'Car Rental Naklua Pattaya | Free Delivery | Pattaya Rent a Car',
      metaDescription: 'Rent a car or motorbike in Naklua with free delivery to your condo or hotel. Economy cars to SUVs, first-class insurance, daily and monthly rates. Book today.'
    },
    en: {
      name: 'Naklua',
      h1: 'Car & Motorbike Rental in Naklua — Free Delivery to Your Door',
      intro: "Rent a car or motorbike in Naklua with free delivery across the area. First-class insurance, unlimited kilometres, and daily or monthly rates from Pattaya's trusted local rental company.",
      body: [
        '<h2>Introduction</h2>',
        "<p>Naklua is the older, quieter face of Pattaya — the original fishing community at the north end of the bay, where Thai family seafood restaurants still line the water and the pace is noticeably calmer than the strip to the south. It has become a favourite for long-stay residents, retirees, and families who want to be near the action without living in it. The trade-off is distance: Naklua spreads north along Naklua Road and Soi Naklua, and the things you want — Central Festival, the beach clubs of Wongamat next door, the restaurants on Second Road — are a drive rather than a walk.</p>",
        "<p>That is where having your own vehicle pays off. Naklua's layout, with its long main road and the many sois branching off toward the water, is built around driving, and the songthaew coverage thins out the further north you go. Pattaya Rent a Car has been renting cars and motorbikes across Pattaya since 2009, with a fleet of over 100 vehicles, and we deliver free to Naklua condos, hotels, and houses. You book, we bring the car to you, and you skip the depot queues entirely.</p>",
        '<h2>Why Rent a Car in Naklua</h2>',
        "<p>Naklua rewards mobility more than most areas. The main artery, Naklua Road (Soi Naklua), runs a long way north from the Dolphin Roundabout toward Wong Amat and the Sanctuary of Truth, and the residential sois off it stretch back toward the water in a way that makes walking impractical in the heat. Parking, on the other hand, is far easier here than in central Pattaya — the larger condo projects and the houses in the sois generally have space, which makes keeping a car genuinely practical.</p>",
        "<p>From Naklua you can reach Central Festival and the Beach Road restaurants in ten to fifteen minutes, cut over to Wongamat's beaches in five, and head out to the wider attractions — the Sanctuary of Truth is right on your doorstep — without relying on baht buses. For families doing the school run or anyone heading regularly to the markets and malls, a car turns a daily chore into something simple.</p>",
        '<h2>Free Delivery Information</h2>',
        "<p>We deliver free across the whole of Naklua. That covers the condo projects along Naklua Road and Wong Amat — buildings like The Riviera Wongamat, Baan Plai Haad, Wongamat Tower, and the Zire and Northpoint developments toward the headland — as well as the hotels and the many houses and villas tucked into the Naklua sois. If you're somewhere smaller, just give us the building or soi name; we know the area well.</p>",
        "<p>Delivery isn't limited to your accommodation. We also deliver to U-Tapao Airport, Suvarnabhumi Airport, and partner hotels across the wider Pattaya area. Tell us the time and place when you book and the car will be waiting, with the paperwork handled on the spot.</p>",
        '<h2>Popular Vehicle Types in Naklua</h2>',
        "<p>For getting around Naklua day to day, an economy car like a Toyota Yaris or Honda Brio handles the sois and the parking easily and keeps fuel costs low. Couples and small families often prefer a Toyota Vios or Honda City for longer runs into central Pattaya or out to the airports.</p>",
        "<p>Families in the larger condos and the Naklua houses tend toward an SUV or seven-seat MPV — a Honda CR-V or similar — for the school run and weekend trips. If you're moving anything or heading out of town, a Toyota Revo pickup is the practical choice. And for short hops between your condo, the seafood restaurants, and the beach, a motorbike makes a lot of sense — a Honda PCX 150 or Honda Click is easy to park and quick through Naklua's quieter traffic. We rent both, and many monthly customers pair a car with a bike.</p>",
        '<h2>Long-Term and Monthly Rentals</h2>',
        "<p>Naklua has a large long-stay population — retirees, snowbirds, and families settled in for months at a time — and monthly rental is where the value shows. Over a full month, a monthly rate works out far cheaper than daily taxis and Bolt rides, and it removes the friction of arranging transport every time you leave the condo. Compared with buying or leasing a Thai-registered car, a monthly rental keeps you flexible with no resale or transfer paperwork to worry about. VAT receipts are available for business and corporate renters.</p>",
        '<h2>Driving Tips for Naklua</h2>',
        "<p>A few things worth knowing. Naklua Road is the spine of the area and gets busy near the Dolphin Roundabout, where it meets Beach Road and Second Road — give yourself time at peak hours. The sois off Naklua Road are narrow and often two-way despite their width, so take them gently and watch for parked cars. Motorbikes weave constantly, so check mirrors before turning. Heading south into central Pattaya, the one-way system around Beach Road and Second Road catches people out — learn the loop and it becomes second nature. Parking near the Lan Po seafood area fills up at mealtimes, so arrive a little early if you're heading there for dinner.</p>"
      ].join(''),
      faqs: [
        { question: 'Do you deliver free to my condo in Naklua or Wong Amat?', answer: 'Yes. We deliver free to all condos, hotels, and houses across Naklua and Wong Amat, including The Riviera, Baan Plai Haad, and Wongamat Tower. Just give us your building name and pickup time when you book.' },
        { question: 'What insurance is included?', answer: "Every rental includes first-class insurance through Viriyah, Thailand's leading motor insurer, with a fixed excess per incident." },
        { question: 'What is the damage excess?', answer: "The excess is THB 5,000 per incident, the same whether you're driving an economy car or an SUV." },
        { question: 'Is a deposit required?', answer: 'Yes, a refundable deposit of THB 5,000 is taken on collection and returned when you bring the vehicle back in the same condition.' },
        { question: 'What documents do I need to rent a car in Naklua?', answer: "You'll need a valid passport and a driving licence. An International Driving Permit is recommended for full legality in Thailand." },
        { question: 'Can I drive from Naklua to U-Tapao or Suvarnabhumi airport?', answer: 'Easily. U-Tapao is around 50 minutes south, and Suvarnabhumi roughly 90 minutes north. We can also deliver or collect at either airport.' },
        { question: 'Are monthly rentals available in Naklua?', answer: "Yes, and they're popular here given the long-stay community. Monthly rates are significantly cheaper than daily hire, and we can pair a car with a motorbike if you'd like both." },
        { question: 'Can I rent a motorbike instead of a car?', answer: "Yes. We rent motorbikes including the Honda PCX 150 and Honda Click — a practical choice for getting around Naklua's sois and seafront." },
        { question: 'Can I extend my rental if I decide to stay longer?', answer: "Yes. Just let us know — we ask for around 7 days' notice to guarantee the extension on your current vehicle, though we'll always do our best at shorter notice." }
      ]
    }
  }
  // Wongamat and Pratumnak will be added here once the script is proven on Naklua.
];
