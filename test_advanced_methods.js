#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Test papers from ArXiv
const testPapers = [
  {
    id: '2506.17218v1',
    title: 'Machine Mental Imagery: Empower Multimodal Reasoning with Latent Visual Tokens',
    pdf_url: 'https://arxiv.org/pdf/2506.17218v1.pdf'
  }
];

// Advanced methods focused on working solutions
const advancedMethods = [
  {
    name: 'Method A1: PDF to Image using CloudConvert API',
    generateUrl: (pdfUrl) => {
      // CloudConvert has a free tier for PDF to image conversion
      return `https://api.cloudconvert.com/v2/convert/pdf/png?input=${encodeURIComponent(pdfUrl)}&width=800&height=1000`;
    }
  },
  {
    name: 'Method A2: HTML Canvas with PDF.js Rendering',
    description: 'This would need to be implemented server-side with Node.js',
    generateUrl: () => null // Server-side only
  },
  {
    name: 'Method A3: Puppeteer via ScrapingBee',
    generateUrl: (pdfUrl) => {
      return `https://app.scrapingbee.com/api/v1/?api_key=demo&url=${encodeURIComponent(pdfUrl)}&screenshot=true&window_width=1200&window_height=1600`;
    }
  },
  {
    name: 'Method A4: PhantomJSCloud',
    generateUrl: (pdfUrl) => {
      return `https://phantomjscloud.com/api/browser/v2/ak-9phbx-bphxr-bwfm3-k7t15-wbmmj/?request={"url":"${pdfUrl}","renderType":"png","outputAsJson":false,"requestSettings":{"resourceWait":3000}}`;
    }
  },
  {
    name: 'Method A5: ShrinkTheWeb',
    generateUrl: (pdfUrl) => {
      return `https://images.shrinktheweb.com/xino.php?stwembed=1&stwaccesskeyid=demo&stwsize=lg&stwurl=${encodeURIComponent(pdfUrl)}`;
    }
  },
  {
    name: 'Method A6: Web2PDFConvert Screenshot',
    generateUrl: (pdfUrl) => {
      return `https://api.web2pdfconvert.com/v1/screenshot?apikey=demo&url=${encodeURIComponent(pdfUrl)}&format=png&width=800&height=1000`;
    }
  },
  {
    name: 'Method A7: Capture Website',
    generateUrl: (pdfUrl) => {
      return `https://api.apiflash.com/v1/urltoimage?access_key=demo&url=${encodeURIComponent(pdfUrl)}&format=png&width=800&height=1000`;
    }
  },
  {
    name: 'Method A8: Screenshot Layer',
    generateUrl: (pdfUrl) => {
      return `https://api.screenshotlayer.com/api/capture?access_key=demo&url=${encodeURIComponent(pdfUrl)}&format=PNG&viewport=1200x1600`;
    }
  },
  {
    name: 'Method A9: PDFShift Screenshot',
    generateUrl: (pdfUrl) => {
      return `https://api.pdfshift.io/v3/convert/pdf?source=${encodeURIComponent(pdfUrl)}&format=png`;
    }
  },
  {
    name: 'Method A10: ArXiv Abstract Page Screenshot',
    generateUrl: (pdfUrl) => {
      const arxivId = pdfUrl.match(/arxiv\.org\/pdf\/([^/]+)/)?.[1];
      if (arxivId) {
        const abstractUrl = `https://arxiv.org/abs/${arxivId.replace('.pdf', '')}`;
        return `https://mini.s-shot.ru/800x1000/PNG/800/PNG/?${encodeURIComponent(abstractUrl)}`;
      }
      return null;
    }
  },
  {
    name: 'Method A11: PDF Thumbnail via Mozilla PDF.js Direct',
    description: 'Use PDF.js directly without browser wrapper',
    generateUrl: () => null // Server-side implementation needed
  },
  {
    name: 'Method A12: WeasyPrint HTML to PNG',
    description: 'Convert ArXiv abstract page to clean image',
    generateUrl: (pdfUrl) => {
      const arxivId = pdfUrl.match(/arxiv\.org\/pdf\/([^/]+)/)?.[1];
      if (arxivId) {
        const abstractUrl = `https://arxiv.org/abs/${arxivId.replace('.pdf', '')}`;
        return `https://htmlcsstoimage.com/demo_run?url=${encodeURIComponent(abstractUrl)}&width=800&height=1000`;
      }
      return null;
    }
  }
];

// Create test directory
const testDir = './advanced_thumbnail_tests';
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir);
}

// Function to download and save image
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    
    const request = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'image/png,image/jpeg,image/gif,image/webp,image/*,*/*'
      }
    }, (response) => {
      if (response.statusCode === 200) {
        const file = fs.createWriteStream(filepath);
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve({ 
            success: true, 
            statusCode: response.statusCode, 
            contentType: response.headers['content-type'],
            contentLength: response.headers['content-length']
          });
        });
      } else if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirects
        const location = response.headers.location;
        if (location) {
          console.log(`    Redirecting to: ${location}`);
          downloadImage(location, filepath).then(resolve).catch(reject);
        } else {
          reject(new Error(`HTTP ${response.statusCode}: No redirect location`));
        }
      } else {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
      }
    });
    
    request.on('error', (err) => {
      reject(err);
    });
    
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Function to test advanced methods
async function testAdvancedMethods() {
  console.log('Starting ADVANCED thumbnail generation testing...\n');
  
  const results = [];
  
  for (const paper of testPapers) {
    console.log(`Testing paper: ${paper.title} (${paper.id})`);
    console.log(`PDF URL: ${paper.pdf_url}\n`);
    
    const paperResults = {
      paper: paper,
      methodResults: []
    };
    
    for (const method of advancedMethods) {
      console.log(`  Testing ${method.name}...`);
      
      try {
        const thumbnailUrl = method.generateUrl ? method.generateUrl(paper.pdf_url) : null;
        
        if (!thumbnailUrl) {
          console.log(`    ❌ Method requires server-side implementation or not applicable`);
          paperResults.methodResults.push({
            method: method.name,
            success: false,
            error: 'Server-side implementation needed or not applicable'
          });
          continue;
        }
        
        console.log(`    URL: ${thumbnailUrl}`);
        
        const filename = `${paper.id}_${method.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
        const filepath = path.join(testDir, filename);
        
        const result = await downloadImage(thumbnailUrl, filepath);
        
        // Check file size and type
        const stats = fs.statSync(filepath);
        const fileSize = stats.size;
        
        // Try to determine if it's actually an image
        const fileBuffer = fs.readFileSync(filepath);
        const isImage = fileBuffer[0] === 0x89 && fileBuffer[1] === 0x50 && fileBuffer[2] === 0x4E && fileBuffer[3] === 0x47 || // PNG
                        fileBuffer[0] === 0xFF && fileBuffer[1] === 0xD8 && fileBuffer[2] === 0xFF || // JPEG
                        fileBuffer[0] === 0x47 && fileBuffer[1] === 0x49 && fileBuffer[2] === 0x46; // GIF
        
        if (fileSize < 1000 && !isImage) {
          console.log(`    ⚠️  File too small (${fileSize} bytes) and not a valid image, likely an error page`);
          paperResults.methodResults.push({
            method: method.name,
            success: false,
            error: `File too small and invalid: ${fileSize} bytes`,
            url: thumbnailUrl
          });
        } else if (!isImage) {
          console.log(`    ⚠️  File is not a valid image format (${fileSize} bytes)`);
          paperResults.methodResults.push({
            method: method.name,
            success: false,
            error: `Invalid image format: ${fileSize} bytes`,
            url: thumbnailUrl
          });
        } else {
          console.log(`    ✅ Success! Downloaded valid image ${fileSize} bytes (${result.contentType})`);
          paperResults.methodResults.push({
            method: method.name,
            success: true,
            fileSize: fileSize,
            contentType: result.contentType,
            url: thumbnailUrl,
            savedAs: filename,
            isValidImage: isImage
          });
        }
        
      } catch (error) {
        console.log(`    ❌ Failed: ${error.message}`);
        paperResults.methodResults.push({
          method: method.name,
          success: false,
          error: error.message
        });
      }
      
      // Longer delay for advanced methods
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    results.push(paperResults);
    console.log('');
  }
  
  // Generate advanced report
  generateAdvancedReport(results);
}

function generateAdvancedReport(results) {
  console.log('\n' + '='.repeat(80));
  console.log('ADVANCED THUMBNAIL GENERATION TEST REPORT');
  console.log('='.repeat(80));
  
  const methodSuccessRates = {};
  
  // Calculate success rates per method
  advancedMethods.forEach(method => {
    const successes = results.reduce((count, paperResult) => {
      const methodResult = paperResult.methodResults.find(r => r.method === method.name);
      return count + (methodResult && methodResult.success ? 1 : 0);
    }, 0);
    
    methodSuccessRates[method.name] = {
      successes: successes,
      total: results.length,
      rate: (successes / results.length * 100).toFixed(1)
    };
  });
  
  // Sort methods by success rate
  const sortedMethods = Object.entries(methodSuccessRates)
    .sort(([,a], [,b]) => b.rate - a.rate);
  
  console.log('\nADVANCED METHOD RANKINGS (by success rate):');
  console.log('-'.repeat(60));
  
  sortedMethods.forEach(([methodName, stats], index) => {
    const rank = index + 1;
    const status = stats.rate > 50 ? '🟢' : stats.rate > 0 ? '🟡' : '🔴';
    console.log(`${rank.toString().padStart(2)}. ${status} ${methodName}`);
    console.log(`    Success: ${stats.successes}/${stats.total} (${stats.rate}%)`);
  });
  
  console.log('\nDETAILED ADVANCED RESULTS:');
  console.log('-'.repeat(50));
  
  results.forEach(paperResult => {
    console.log(`\n📄 ${paperResult.paper.title} (${paperResult.paper.id})`);
    
    const successfulMethods = paperResult.methodResults.filter(r => r.success);
    const failedMethods = paperResult.methodResults.filter(r => !r.success);
    
    console.log(`   ✅ Successful advanced methods: ${successfulMethods.length}`);
    successfulMethods.forEach(method => {
      console.log(`      - ${method.method}`);
      console.log(`        File: ${method.savedAs} (${method.fileSize} bytes)`);
      console.log(`        Valid Image: ${method.isValidImage ? 'Yes' : 'No'}`);
    });
    
    console.log(`   ❌ Failed advanced methods: ${failedMethods.length}`);
    failedMethods.forEach(method => {
      console.log(`      - ${method.method}: ${method.error}`);
    });
  });
  
  // Save detailed report
  const reportData = {
    testDate: new Date().toISOString(),
    testType: 'Advanced Methods',
    summary: {
      totalPapers: results.length,
      totalMethods: advancedMethods.length,
      methodSuccessRates: methodSuccessRates
    },
    detailedResults: results
  };
  
  fs.writeFileSync(
    path.join(testDir, 'advanced_test_report.json'), 
    JSON.stringify(reportData, null, 2)
  );
  
  console.log(`\n📊 Advanced report saved to: ${path.join(testDir, 'advanced_test_report.json')}`);
  console.log(`📁 Advanced test images saved to: ${testDir}/`);
  
  // Implementation recommendations
  const topMethods = sortedMethods.slice(0, 3).filter(([,stats]) => stats.rate > 0);
  
  console.log('\n🚀 IMPLEMENTATION RECOMMENDATIONS:');
  console.log('-'.repeat(50));
  
  if (topMethods.length > 0) {
    topMethods.forEach(([methodName, stats], index) => {
      console.log(`${index + 1}. Implement "${methodName}" (${stats.rate}% success rate)`);
    });
  } else {
    console.log('No external APIs succeeded. Recommend server-side implementation:');
    console.log('1. Use Node.js with PDF-poppler or pdf2pic for server-side PDF to image conversion');
    console.log('2. Use Canvas API with PDF.js to render PDF pages on the server');
    console.log('3. Use Puppeteer with your own server to screenshot PDF URLs');
  }
  
  console.log('\n💡 SERVER-SIDE IMPLEMENTATION SUGGESTIONS:');
  console.log('-'.repeat(50));
  console.log('1. PDF-to-Image with pdf2pic:');
  console.log('   npm install pdf2pic');
  console.log('   Convert PDF first page to PNG/JPEG');
  console.log('');
  console.log('2. PDF.js Server-side Rendering:');
  console.log('   npm install pdfjs-dist canvas');
  console.log('   Render PDF page to Canvas, export as image');
  console.log('');
  console.log('3. Puppeteer Screenshot:');
  console.log('   npm install puppeteer');
  console.log('   Screenshot PDF URLs with headless Chrome');
  
  console.log('\n' + '='.repeat(80));
}

// Run the advanced tests
if (require.main === module) {
  testAdvancedMethods().catch(console.error);
}

module.exports = { testAdvancedMethods, advancedMethods, testPapers };