const { PrismaClient } = require('@prisma/client');
const https = require('https');
const prisma = new PrismaClient();

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', (e) => reject(e));
  });
}

function decodeHtml(html) {
  if (!html) return '';
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
    .trim();
}

async function main() {
  console.log('Fetching RSS feed...');
  const rssUrl = 'https://www.teluguone.com/news/rss/latestnews/latestnews-25.rss';
  let rssData;
  try {
    rssData = await fetchUrl(rssUrl);
  } catch (e) {
    console.error('Error fetching RSS feed:', e);
    process.exit(1);
  }

  // Extract <item> blocks
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  const rawItems = [];
  while ((match = itemRegex.exec(rssData)) !== null) {
    rawItems.push(match[1]);
  }

  console.log(`Found ${rawItems.length} items in RSS feed. Processing top 20...`);
  const itemsToProcess = rawItems.slice(0, 20);

  // Database Default IDs
  const defaultCategoryId = 'cmpcm23u50000la04929b3cs6'; // Others
  const defaultStateId = 'cmpcaa5h30004v9jct3cbd9mn'; // Telangana
  const defaultAdminId = 'cmpcaa1i10000v9jcxr4cr6cz'; // Super Admin
  const defaultThumbnail = 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=800&auto=format&fit=crop&q=60'; // High-quality default photo

  let importedCount = 0;

  for (const rawItem of itemsToProcess) {
    // Extract title
    const titleMatch = /<title>([\s\S]*?)<\/title>/.exec(rawItem);
    const linkMatch = /<link>([\s\S]*?)<\/link>/.exec(rawItem);
    const pubDateMatch = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(rawItem);

    if (!titleMatch || !linkMatch) continue;

    const title = decodeHtml(titleMatch[1]);
    const link = decodeHtml(linkMatch[1]);
    const pubDateStr = pubDateMatch ? decodeHtml(pubDateMatch[1]) : new Date().toISOString();
    const publishedAt = new Date(pubDateStr);

    console.log(`\nProcessing article: "${title}"`);
    console.log(`Link: ${link}`);

    let description = '';
    let imageUrl = defaultThumbnail;

    // Fetch the article details page to extract meta tags
    try {
      const pageHtml = await fetchUrl(link);

      // Extract description from meta tags
      const ogDescMatch = /<meta\s+property=["']og:description["']\s+content=["']([\s\S]*?)["']/.exec(pageHtml) ||
                          /<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']/.exec(pageHtml);
      if (ogDescMatch) {
        description = decodeHtml(ogDescMatch[1]);
      }

      // Extract image from meta tags
      const ogImageMatch = /<meta\s+property=["']og:image["']\s+content=["']([\s\S]*?)["']/.exec(pageHtml) ||
                           /<meta\s+name=["']twitter:image["']\s+content=["']([\s\S]*?)["']/.exec(pageHtml);
      if (ogImageMatch) {
        imageUrl = decodeHtml(ogImageMatch[1]);
      }
    } catch (e) {
      console.log(`Failed to fetch/scrape details from ${link}. Using defaults.`);
    }

    if (!description || description.trim().length === 0) {
      description = `తెలుగువన్ అందిస్తున్న తాజా వార్తలు: ${title}. మరింత సమాచారం కోసం అసలు కథనాన్ని చూడండి.`;
    }

    // Check if this link already exists in the database
    const existing = await prisma.news.findFirst({
      where: {
        title: title
      }
    });

    if (existing) {
      console.log('Article with this title already exists. Skipping...');
      continue;
    }

    // Insert into database
    try {
      await prisma.news.create({
        data: {
          title: title,
          shortDesc: description.substring(0, 500), // Limit summary size
          content: description,
          thumbnailUrl: imageUrl,
          imagesUrls: JSON.stringify([imageUrl]),
          sourceType: 'rss',
          sourceUrl: link,
          status: 'published',
          publishedAt: publishedAt,
          categoryId: defaultCategoryId,
          stateId: defaultStateId,
          createdBy: defaultAdminId,
        }
      });
      console.log('✓ Successfully imported to database.');
      importedCount++;
    } catch (dbErr) {
      console.error('Error saving to DB:', dbErr);
    }
  }

  console.log(`\nImport complete! Successfully imported ${importedCount} news items.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
