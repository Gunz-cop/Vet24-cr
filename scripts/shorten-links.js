import fs from 'fs';
import path from 'path';

// Load API Key
let apiKey = process.env.LINKZIP_API_KEY;
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  const match = envContent.match(/LINKZIP_API_KEY\s*=\s*(.*)/);
  if (match) {
    apiKey = match[1].trim().replace(/^['"]|['"]$/g, '');
  }
}

if (!apiKey) {
  console.warn('⚠️ LINKZIP_API_KEY not found in environment variables or .env file. The script will run in validation/dry-run mode without generating new shortened links.');
}

const cachePath = './src/linkzip-cache.json';
let cache = {};
if (fs.existsSync(cachePath)) {
  try {
    cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  } catch (err) {
    console.error('Error reading cache file:', err);
  }
}

const clinicasDir = './src/content/clinicas';
if (!fs.existsSync(clinicasDir)) {
  console.error(`Directory not found: ${clinicasDir}`);
  process.exit(1);
}

const files = fs.readdirSync(clinicasDir).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));

const parseField = (frontmatter, field) => {
  const regex = new RegExp(`^${field}:\\s*(.*)$`, 'm');
  const match = frontmatter.match(regex);
  if (match) {
    return match[1].trim().replace(/^['"]|['"]$/g, '');
  }
  return '';
};

// Format URLs correctly for Linkzip API
const formatUrl = (value, type) => {
  if (!value) return null;
  
  // If it's already a short link, don't re-shorten
  if (value.includes('linkzip.uk')) return null;

  if (type === 'web') {
    return value.startsWith('http') ? value : `https://${value}`;
  }
  if (type === 'facebook') {
    return value.startsWith('http') ? value : `https://${value}`;
  }
  if (type === 'instagram') {
    if (value.startsWith('http')) return value;
    const cleanUsername = value.replace('@', '');
    return `https://instagram.com/${cleanUsername}`;
  }
  return null;
};

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log(`Analyzing ${files.length} clinic files...`);
  let urlsToShorten = [];

  for (const file of files) {
    const filePath = path.join(clinicasDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Extract frontmatter block (everything between first --- and next ---)
    const parts = fileContent.split('---');
    if (parts.length < 3) continue;
    const fm = parts[1];

    const nombre = parseField(fm, 'nombre') || file.replace('.md', '');
    const web = parseField(fm, 'web');
    const facebook = parseField(fm, 'facebook');
    const instagram = parseField(fm, 'instagram');

    const links = [
      { raw: web, type: 'web', label: 'Website' },
      { raw: facebook, type: 'facebook', label: 'Facebook' },
      { raw: instagram, type: 'instagram', label: 'Instagram' }
    ];

    for (const link of links) {
      const formatted = formatUrl(link.raw, link.type);
      if (formatted) {
        urlsToShorten.push({
          originalUrl: formatted,
          clinicName: nombre,
          type: link.label
        });
      }
    }
  }

  // Filter out URLs that are already cached
  const missingUrls = urlsToShorten.filter(item => !cache[item.originalUrl]);
  
  console.log(`Found ${urlsToShorten.length} total URLs.`);
  console.log(`Missing from cache: ${missingUrls.length} URLs.`);

  if (missingUrls.length === 0) {
    console.log('✅ All URLs are already cached. Nothing to shorten.');
    return;
  }

  if (!apiKey) {
    console.log('❌ Cannot shorten missing URLs because LINKZIP_API_KEY is not set.');
    return;
  }

  console.log(`Shortening ${missingUrls.length} links using Linkzip API (with rate limit delay)...`);
  
  let successCount = 0;
  for (let i = 0; i < missingUrls.length; i++) {
    const item = missingUrls[i];
    console.log(`[${i + 1}/${missingUrls.length}] Shortening ${item.type} for ${item.clinicName}...`);
    
    try {
      const response = await fetch('https://linkzip.uk/api/v1/links', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          longUrl: item.originalUrl,
          title: `${item.clinicName} - ${item.type}`,
          category: `Vet24 ${item.type}`
        })
      });

      const data = await response.json();
      
      if (response.ok && data.shortUrl) {
        cache[item.originalUrl] = data.shortUrl;
        successCount++;
        console.log(`   └─ Success: ${data.shortUrl}`);
        
        // Write incrementally to avoid losing progress in case of error
        fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf8');
      } else {
        console.error(`   └─ Error: ${data.error || response.statusText}`);
      }
    } catch (err) {
      console.error(`   └─ Request failed for ${item.originalUrl}:`, err.message);
    }

    // Add a delay (e.g. 500ms) to stay within rate limits (60/min)
    if (i < missingUrls.length - 1) {
      await delay(500);
    }
  }

  console.log(`Finished processing. Shortened ${successCount}/${missingUrls.length} new links.`);
}

run().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
