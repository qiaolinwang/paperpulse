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
  },
  {
    id: '2506.17219v1', 
    title: 'Test Paper 2',
    pdf_url: 'https://arxiv.org/pdf/2506.17219v1.pdf'
  },
  {
    id: '2506.17220v1',
    title: 'Test Paper 3', 
    pdf_url: 'https://arxiv.org/pdf/2506.17220v1.pdf'
  }
];

// Multiple thumbnail generation methods to test
const thumbnailMethods = [
  {
    name: 'Method 1: PDF.js Web Viewer',
    generateUrl: (pdfUrl) => {
      const viewerUrl = `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(pdfUrl)}`;
      return `https://mini.s-shot.ru/800x1000/PNG/800/PNG/?${encodeURIComponent(viewerUrl)}`;
    }
  },
  {
    name: 'Method 2: Google Docs Embedded Viewer',
    generateUrl: (pdfUrl) => {
      const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true`;
      return `https://mini.s-shot.ru/1024x768/PNG/1024/PNG/?${encodeURIComponent(viewerUrl)}`;
    }
  },
  {
    name: 'Method 3: Direct PDF Screenshot (s-shot)',
    generateUrl: (pdfUrl) => {
      return `https://mini.s-shot.ru/1200x900/PNG/1200/PNG/?${encodeURIComponent(pdfUrl)}`;
    }
  },
  {
    name: 'Method 4: Thum.io with Delay',
    generateUrl: (pdfUrl) => {
      return `https://image.thum.io/get/width/600/crop/800/wait/3000/${encodeURIComponent(pdfUrl)}`;
    }
  },
  {
    name: 'Method 5: ScreenshotMachine',
    generateUrl: (pdfUrl) => {
      return `https://api.screenshotmachine.com/?key=demo&url=${encodeURIComponent(pdfUrl)}&dimension=1024x768&format=png`;
    }
  },
  {
    name: 'Method 6: Htmlcsstoimage',
    generateUrl: (pdfUrl) => {
      return `https://hcti.io/v1/image?url=${encodeURIComponent(pdfUrl)}&width=800&height=1000`;
    }
  },
  {
    name: 'Method 7: Microlink Screenshot',
    generateUrl: (pdfUrl) => {
      return `https://api.microlink.io/screenshot?url=${encodeURIComponent(pdfUrl)}&type=png&viewport.width=800&viewport.height=1000`;
    }
  },
  {
    name: 'Method 8: PagePeeker',
    generateUrl: (pdfUrl) => {
      return `https://free.pagepeeker.com/v2/thumbs.php?size=l&url=${encodeURIComponent(pdfUrl)}`;
    }
  },
  {
    name: 'Method 9: WebThumb',
    generateUrl: (pdfUrl) => {
      return `http://webthumb.bluga.net/easythumb?user=guest&url=${encodeURIComponent(pdfUrl)}&type=png&width=800&height=1000`;
    }
  },
  {
    name: 'Method 10: Urlbox',
    generateUrl: (pdfUrl) => {
      return `https://api.urlbox.io/v1/ca482d7e-9417-4569-90fe-80f7c5e1c781/png?url=${encodeURIComponent(pdfUrl)}&width=800&height=1000`;
    }
  },
  {
    name: 'Method 11: ArXiv Native (if exists)',
    generateUrl: (pdfUrl) => {
      const arxivId = pdfUrl.match(/arxiv\.org\/pdf\/([^/]+)/)?.[1];
      if (arxivId) {
        return `https://arxiv.org/pdf/${arxivId}.png`;
      }
      return null;
    }
  },
  {
    name: 'Method 12: Chrome Headless via Browserless',
    generateUrl: (pdfUrl) => {
      return `https://chrome.browserless.io/screenshot?token=demo&url=${encodeURIComponent(pdfUrl)}`;
    }
  }
];

// Create test directory
const testDir = './thumbnail_tests';
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir);
}

// Function to download and save image
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    
    const request = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    }, (response) => {
      if (response.statusCode === 200) {
        const file = fs.createWriteStream(filepath);
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve({ success: true, statusCode: response.statusCode, contentType: response.headers['content-type'] });
        });
      } else {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
      }
    });
    
    request.on('error', (err) => {
      reject(err);
    });
    
    request.setTimeout(15000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Function to test all methods for all papers
async function testAllMethods() {
  console.log('Starting comprehensive thumbnail generation testing...\n');
  
  const results = [];
  
  for (const paper of testPapers) {
    console.log(`Testing paper: ${paper.title} (${paper.id})`);
    console.log(`PDF URL: ${paper.pdf_url}\n`);
    
    const paperResults = {
      paper: paper,
      methodResults: []
    };
    
    for (const method of thumbnailMethods) {
      console.log(`  Testing ${method.name}...`);
      
      try {
        const thumbnailUrl = method.generateUrl(paper.pdf_url);
        
        if (!thumbnailUrl) {
          console.log(`    ❌ Method not applicable for this paper`);
          paperResults.methodResults.push({
            method: method.name,
            success: false,
            error: 'Method not applicable'
          });
          continue;
        }
        
        console.log(`    URL: ${thumbnailUrl}`);
        
        const filename = `${paper.id}_${method.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
        const filepath = path.join(testDir, filename);
        
        const result = await downloadImage(thumbnailUrl, filepath);
        
        // Check file size to determine if it's a valid image
        const stats = fs.statSync(filepath);
        const fileSize = stats.size;
        
        if (fileSize < 1000) {
          console.log(`    ⚠️  File too small (${fileSize} bytes), likely an error page`);
          paperResults.methodResults.push({
            method: method.name,
            success: false,
            error: `File too small: ${fileSize} bytes`,
            url: thumbnailUrl
          });
        } else {
          console.log(`    ✅ Success! Downloaded ${fileSize} bytes (${result.contentType})`);
          paperResults.methodResults.push({
            method: method.name,
            success: true,
            fileSize: fileSize,
            contentType: result.contentType,
            url: thumbnailUrl,
            savedAs: filename
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
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    results.push(paperResults);
    console.log('');
  }
  
  // Generate summary report
  generateReport(results);
}

function generateReport(results) {
  console.log('\n' + '='.repeat(80));
  console.log('THUMBNAIL GENERATION TEST REPORT');
  console.log('='.repeat(80));
  
  const methodSuccessRates = {};
  
  // Calculate success rates per method
  thumbnailMethods.forEach(method => {
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
  
  console.log('\nMETHOD RANKINGS (by success rate):');
  console.log('-'.repeat(50));
  
  sortedMethods.forEach(([methodName, stats], index) => {
    const rank = index + 1;
    const status = stats.rate > 50 ? '🟢' : stats.rate > 0 ? '🟡' : '🔴';
    console.log(`${rank.toString().padStart(2)}. ${status} ${methodName}`);
    console.log(`    Success: ${stats.successes}/${stats.total} (${stats.rate}%)`);
  });
  
  console.log('\nDETAILED RESULTS BY PAPER:');
  console.log('-'.repeat(50));
  
  results.forEach(paperResult => {
    console.log(`\n📄 ${paperResult.paper.title} (${paperResult.paper.id})`);
    
    const successfulMethods = paperResult.methodResults.filter(r => r.success);
    const failedMethods = paperResult.methodResults.filter(r => !r.success);
    
    console.log(`   ✅ Successful methods: ${successfulMethods.length}`);
    successfulMethods.forEach(method => {
      console.log(`      - ${method.method} (${method.fileSize} bytes)`);
    });
    
    console.log(`   ❌ Failed methods: ${failedMethods.length}`);
    failedMethods.forEach(method => {
      console.log(`      - ${method.method}: ${method.error}`);
    });
  });
  
  // Save detailed report to file
  const reportData = {
    testDate: new Date().toISOString(),
    summary: {
      totalPapers: results.length,
      totalMethods: thumbnailMethods.length,
      methodSuccessRates: methodSuccessRates
    },
    detailedResults: results
  };
  
  fs.writeFileSync(
    path.join(testDir, 'test_report.json'), 
    JSON.stringify(reportData, null, 2)
  );
  
  console.log(`\n📊 Detailed report saved to: ${path.join(testDir, 'test_report.json')}`);
  console.log(`📁 Test images saved to: ${testDir}/`);
  
  // Recommendations
  const topMethods = sortedMethods.slice(0, 3).filter(([,stats]) => stats.rate > 0);
  
  if (topMethods.length > 0) {
    console.log('\n🎯 RECOMMENDATIONS:');
    console.log('-'.repeat(30));
    topMethods.forEach(([methodName, stats], index) => {
      console.log(`${index + 1}. Use "${methodName}" (${stats.rate}% success rate)`);
    });
  } else {
    console.log('\n⚠️  No methods achieved reliable success rates. Consider implementing PDF-to-image conversion on the server side.');
  }
  
  console.log('\n' + '='.repeat(80));
}

// Run the tests
if (require.main === module) {
  testAllMethods().catch(console.error);
}

module.exports = { testAllMethods, thumbnailMethods, testPapers };