"""
Professional PDF parsing for extracting figures, tables, and sections from arXiv papers
"""
import logging
import requests
import tempfile
import os
from typing import Dict, List, Optional, Tuple
import re
from pathlib import Path

logger = logging.getLogger(__name__)

class PaperPDFParser:
    """Parse arXiv PDFs to extract structure, figures, and tables"""
    
    def __init__(self):
        self.temp_dir = None
    
    def download_pdf(self, pdf_url: str) -> Optional[str]:
        """Download PDF from arXiv URL"""
        try:
            response = requests.get(pdf_url, timeout=30)
            response.raise_for_status()
            
            # Create temp file
            self.temp_dir = tempfile.mkdtemp()
            pdf_path = os.path.join(self.temp_dir, "paper.pdf")
            
            with open(pdf_path, 'wb') as f:
                f.write(response.content)
            
            logger.info(f"Downloaded PDF: {pdf_url}")
            return pdf_path
            
        except Exception as e:
            logger.error(f"Failed to download PDF {pdf_url}: {e}")
            return None
    
    def extract_text_with_pymupdf(self, pdf_path: str) -> List[Dict]:
        """Extract text with page and position info using PyMuPDF"""
        try:
            import fitz  # PyMuPDF
            
            doc = fitz.open(pdf_path)
            pages_data = []
            
            for page_num in range(len(doc)):
                page = doc[page_num]
                
                # Extract text blocks with position info
                blocks = page.get_text("dict")
                
                page_data = {
                    'page_num': page_num + 1,
                    'blocks': [],
                    'images': [],
                    'tables': []
                }
                
                # Process text blocks
                for block in blocks['blocks']:
                    if 'lines' in block:  # Text block
                        text_content = []
                        for line in block['lines']:
                            for span in line['spans']:
                                text_content.append(span['text'])
                        
                        if text_content:
                            page_data['blocks'].append({
                                'text': ' '.join(text_content),
                                'bbox': block['bbox'],
                                'font_size': span.get('size', 0) if 'span' in locals() else 0
                            })
                    
                    elif 'image' in block:  # Image block
                        page_data['images'].append({
                            'bbox': block['bbox'],
                            'type': 'image'
                        })
                
                pages_data.append(page_data)
            
            doc.close()
            return pages_data
            
        except ImportError:
            logger.warning("PyMuPDF not available, falling back to basic extraction")
            return self.extract_text_basic(pdf_path)
        except Exception as e:
            logger.error(f"PyMuPDF extraction failed: {e}")
            return self.extract_text_basic(pdf_path)
    
    def extract_text_basic(self, pdf_path: str) -> List[Dict]:
        """Basic text extraction fallback"""
        try:
            import PyPDF2
            
            pages_data = []
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                
                for page_num, page in enumerate(pdf_reader.pages):
                    text = page.extract_text()
                    pages_data.append({
                        'page_num': page_num + 1,
                        'blocks': [{'text': text, 'bbox': None, 'font_size': 0}],
                        'images': [],
                        'tables': []
                    })
            
            return pages_data
            
        except Exception as e:
            logger.error(f"Basic PDF extraction failed: {e}")
            return []
    
    def identify_sections(self, pages_data: List[Dict]) -> List[Dict]:
        """Identify paper sections from text blocks"""
        sections = []
        current_section = None
        
        # Common section patterns
        section_patterns = [
            r'^(\d+\.?\s+)?abstract\s*$',
            r'^(\d+\.?\s+)?introduction\s*$',
            r'^(\d+\.?\s+)?related\s+work\s*$',
            r'^(\d+\.?\s+)?background\s*$',
            r'^(\d+\.?\s+)?methodology?\s*$',
            r'^(\d+\.?\s+)?method\s*$',
            r'^(\d+\.?\s+)?approach\s*$',
            r'^(\d+\.?\s+)?experiments?\s*$',
            r'^(\d+\.?\s+)?evaluation\s*$',
            r'^(\d+\.?\s+)?results?\s*$',
            r'^(\d+\.?\s+)?discussion\s*$',
            r'^(\d+\.?\s+)?conclusions?\s*$',
            r'^(\d+\.?\s+)?future\s+work\s*$',
            r'^(\d+\.?\s+)?references?\s*$',
            r'^(\d+\.?\s+)?acknowledgments?\s*$'
        ]
        
        for page_data in pages_data:
            for block in page_data['blocks']:
                text = block['text'].strip()
                
                # Check if this looks like a section header
                for pattern in section_patterns:
                    if re.match(pattern, text.lower()) and len(text) < 50:
                        if current_section:
                            sections.append(current_section)
                        
                        current_section = {
                            'title': text.title(),
                            'content': '',
                            'page': page_data['page_num'],
                            'reading_time': 0
                        }
                        break
                else:
                    # Add to current section content
                    if current_section and len(text) > 20:
                        current_section['content'] += ' ' + text
        
        # Add last section
        if current_section:
            sections.append(current_section)
        
        # Calculate reading times (average 200 words per minute)
        for section in sections:
            word_count = len(section['content'].split())
            section['reading_time'] = max(1, round(word_count / 200))
        
        return sections
    
    def identify_figures_and_tables(self, pages_data: List[Dict]) -> List[Dict]:
        """Identify figures and tables from text and images"""
        figures = []
        
        for page_data in pages_data:
            # Look for figure/table captions
            for block in page_data['blocks']:
                text = block['text'].strip()
                
                # Figure pattern
                fig_match = re.search(r'(figure|fig\.?)\s+(\d+)[:.]?\s*(.+)', text.lower())
                if fig_match:
                    figures.append({
                        'id': f"fig{fig_match.group(2)}",
                        'title': f"Figure {fig_match.group(2)}",
                        'description': fig_match.group(3)[:200] + "..." if len(fig_match.group(3)) > 200 else fig_match.group(3),
                        'type': 'figure',
                        'page': page_data['page_num']
                    })
                
                # Table pattern
                table_match = re.search(r'table\s+(\d+)[:.]?\s*(.+)', text.lower())
                if table_match:
                    figures.append({
                        'id': f"table{table_match.group(1)}",
                        'title': f"Table {table_match.group(1)}",
                        'description': table_match.group(2)[:200] + "..." if len(table_match.group(2)) > 200 else table_match.group(2),
                        'type': 'table',
                        'page': page_data['page_num']
                    })
            
            # Add image blocks as potential figures
            for i, img in enumerate(page_data['images']):
                figures.append({
                    'id': f"img_p{page_data['page_num']}_{i}",
                    'title': f"Figure (Page {page_data['page_num']})",
                    'description': "Visual content identified in the paper",
                    'type': 'image',
                    'page': page_data['page_num']
                })
        
        return figures
    
    def parse_paper(self, pdf_url: str) -> Dict:
        """Parse complete paper structure"""
        try:
            # Download PDF
            pdf_path = self.download_pdf(pdf_url)
            if not pdf_path:
                return self._empty_result("Failed to download PDF")
            
            # Extract text and structure
            pages_data = self.extract_text_with_pymupdf(pdf_path)
            if not pages_data:
                return self._empty_result("Failed to extract text from PDF")
            
            # Identify sections
            sections = self.identify_sections(pages_data)
            
            # Identify figures and tables
            figures = self.identify_figures_and_tables(pages_data)
            
            # Clean up
            self._cleanup()
            
            return {
                'success': True,
                'sections': sections,
                'figures': figures,
                'total_pages': len(pages_data),
                'extraction_method': 'PyMuPDF' if 'fitz' in globals() else 'Basic'
            }
            
        except Exception as e:
            logger.error(f"Paper parsing failed: {e}")
            self._cleanup()
            return self._empty_result(f"Parsing error: {str(e)}")
    
    def _empty_result(self, error_msg: str) -> Dict:
        """Return empty result with error"""
        return {
            'success': False,
            'error': error_msg,
            'sections': [],
            'figures': [],
            'total_pages': 0
        }
    
    def _cleanup(self):
        """Clean up temporary files"""
        if self.temp_dir and os.path.exists(self.temp_dir):
            import shutil
            try:
                shutil.rmtree(self.temp_dir)
            except:
                pass


def parse_arxiv_paper(paper_id: str, pdf_url: str) -> Dict:
    """Convenience function to parse an arXiv paper"""
    parser = PaperPDFParser()
    return parser.parse_paper(pdf_url)