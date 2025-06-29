#!/usr/bin/env node

// Simple test for PDF parsing API
const fetch = require('node-fetch');

async function testPDFParsing() {
  const testCases = [
    {
      paperId: '2506.17219v1',
      pdfUrl: 'http://arxiv.org/pdf/2506.17219v1.pdf',
      title: 'No Free Lunch: Rethinking Internal Feedback for LLM Reasoning'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n🧪 Testing PDF parsing for: ${testCase.title}`);
    console.log(`📄 Paper ID: ${testCase.paperId}`);
    console.log(`🔗 PDF URL: ${testCase.pdfUrl}`);
    
    try {
      const response = await fetch('http://localhost:3000/api/paper/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paperId: testCase.paperId,
          pdfUrl: testCase.pdfUrl
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ PDF parsing successful!');
        console.log(`📊 Extraction method: ${result.extraction_method}`);
        console.log(`📄 Total pages: ${result.total_pages}`);
        console.log(`📖 Sections found: ${result.sections?.length || 0}`);
        console.log(`🖼️ Figures/tables found: ${result.figures?.length || 0}`);
        
        if (result.sections?.length > 0) {
          console.log('\n📖 Extracted Sections:');
          result.sections.forEach((section, i) => {
            console.log(`  ${i + 1}. ${section.title} (${section.reading_time} min)`);
            console.log(`     Content preview: ${section.content?.substring(0, 100)}...`);
          });
        }
        
        if (result.figures?.length > 0) {
          console.log('\n🖼️ Extracted Figures/Tables:');
          result.figures.forEach((fig, i) => {
            console.log(`  ${i + 1}. ${fig.title} (${fig.type})`);
            console.log(`     Description: ${fig.description}`);
          });
        }
      } else {
        console.error('❌ PDF parsing failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ Test error:', error.message);
    }
  }
}

if (require.main === module) {
  testPDFParsing();
}