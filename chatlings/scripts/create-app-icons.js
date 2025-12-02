const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (err) {
  console.log('Sharp not installed. Installing...');
  require('child_process').execSync('npm install sharp', { stdio: 'inherit' });
  sharp = require('sharp');
}

const logoPath = path.join(__dirname, '../admin/assets/logo.png');
const assetsDir = path.join(__dirname, '../assets');

// Ensure assets directory exists
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

async function createIcons() {
  try {
    // Create 192x192 icon
    await sharp(logoPath)
      .resize(192, 192, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(assetsDir, 'icon-192.png'));

    console.log('✓ Created icon-192.png');

    // Create 512x512 icon
    await sharp(logoPath)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(assetsDir, 'icon-512.png'));

    console.log('✓ Created icon-512.png');

    console.log('\nApp icons created successfully in /assets/');
  } catch (error) {
    console.error('Error creating icons:', error);
    process.exit(1);
  }
}

createIcons();
