const { createCanvas } = require('canvas');
const fs = require('fs');
const { promisify } = require('util');
const writeFile = promisify(fs.writeFile);

async function createFavicon() {
  const canvas = createCanvas(32, 32);
  const ctx = canvas.getContext('2d');
  
  // Draw emoji
  ctx.font = '28px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🍜', 16, 16);
  
  // Convert to buffer
  const buffer = canvas.toBuffer('image/png');
  
  // Save the file
  await writeFile('src/favicon/favicon-32x32.png', buffer);
  await writeFile('src/favicon/favicon-16x16.png', buffer);
  
  console.log('Favicon created successfully!');
}

createFavicon().catch(console.error);
