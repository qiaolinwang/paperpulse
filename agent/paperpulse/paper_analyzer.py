"""
Enhanced paper analysis module for generating detailed paper breakdowns
"""
import logging
from typing import Dict, List, Optional
from .summarizer import get_summarizer

logger = logging.getLogger(__name__)

class PaperAnalyzer:
    """Generate comprehensive paper analysis using AI"""
    
    def __init__(self, model: str = "llama-3.1-8b-instant-groq", api_key: Optional[str] = None):
        self.summarizer = get_summarizer(model, api_key)
        self.model = model
    
    def generate_detailed_analysis(self, title: str, abstract: str, authors: List[str], categories: List[str]) -> Dict:
        """Generate comprehensive paper analysis"""
        try:
            # Create comprehensive analysis prompt
            prompt = f"""
Analyze this research paper comprehensively and provide a structured analysis:

**Paper Details:**
Title: {title}
Authors: {', '.join(authors)}
Categories: {', '.join(categories)}
Abstract: {abstract}

Please provide a detailed analysis in the following structured format:

**EXECUTIVE SUMMARY** (2-3 sentences)
[Concise overview of the paper's main contribution and significance]

**KEY CONTRIBUTIONS** (3-5 bullet points)
• [First major contribution]
• [Second major contribution]
• [Third major contribution]
• [Additional contributions if any]

**METHODOLOGY** (2-3 sentences)
[Describe the approach, methods, or techniques used]

**RESULTS & FINDINGS** (2-3 sentences)
[Key results, performance metrics, or discoveries]

**TECHNICAL APPROACH** (2-3 sentences)
[Technical details about the implementation or theoretical framework]

**SIGNIFICANCE & IMPACT** (2-3 sentences)
[Why this work matters, potential applications, impact on field]

**LIMITATIONS & FUTURE WORK** (2-3 sentences)
[Acknowledged limitations and suggested future research directions]

**TECHNICAL DIFFICULTY** (1-5 scale)
[Rate the technical complexity: 1=Basic, 2=Intermediate, 3=Advanced, 4=Expert, 5=Cutting-edge]

**TARGET AUDIENCE** (1-2 sentences)
[Who would benefit most from reading this paper]

Please be thorough but concise, focusing on actionable insights for researchers.
            """
            
            # Get analysis from AI using Groq
            if hasattr(self.summarizer, 'client') and 'groq' in self.model.lower():
                # Use Groq for detailed analysis
                from groq import Groq
                client = Groq(api_key=self.summarizer.api_key)
                
                response = client.chat.completions.create(
                    model=self.model.replace('-groq', ''),
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=5000,
                    temperature=0.7
                )
                
                analysis_text = response.choices[0].message.content.strip()
            else:
                # Fallback to other models with simpler analysis
                analysis_text = self._generate_fallback_analysis(title, abstract, authors, categories)
            
            # Parse the structured response
            parsed_analysis = self._parse_analysis_response(analysis_text)
            
            return parsed_analysis
            
        except Exception as e:
            logger.error(f"Error generating detailed analysis: {e}")
            return self._generate_fallback_analysis(title, abstract, authors, categories)
    
    def _parse_analysis_response(self, analysis_text: str) -> Dict:
        """Parse the structured AI response into components"""
        try:
            sections = {}
            current_section = None
            current_content = []
            
            lines = analysis_text.split('\n')
            
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                
                # Check for section headers
                if line.startswith('**') and line.endswith('**'):
                    # Save previous section
                    if current_section and current_content:
                        sections[current_section] = '\n'.join(current_content).strip()
                    
                    # Start new section
                    current_section = line.replace('**', '').strip().lower().replace(' ', '_')
                    current_content = []
                elif current_section:
                    current_content.append(line)
            
            # Save last section
            if current_section and current_content:
                sections[current_section] = '\n'.join(current_content).strip()
            
            # Extract key contributions as list
            key_contributions = []
            if 'key_contributions' in sections:
                contrib_text = sections['key_contributions']
                for line in contrib_text.split('\n'):
                    line = line.strip()
                    if line.startswith('•') or line.startswith('-'):
                        key_contributions.append(line[1:].strip())
            
            # Extract technical difficulty rating
            technical_difficulty = 3  # default
            if 'technical_difficulty' in sections:
                diff_text = sections['technical_difficulty']
                import re
                match = re.search(r'(\d)', diff_text)
                if match:
                    technical_difficulty = int(match.group(1))
            
            return {
                'executive_summary': sections.get('executive_summary', 'Comprehensive analysis of this research paper.'),
                'key_contributions': key_contributions if key_contributions else [
                    'Novel approach to existing problem',
                    'Improved performance over baseline methods',
                    'Comprehensive experimental validation'
                ],
                'methodology': sections.get('methodology', 'The authors employed a systematic approach combining theoretical analysis with empirical validation.'),
                'results': sections.get('results_&_findings', sections.get('results', 'The proposed method achieves competitive performance across multiple benchmarks.')),
                'technical_approach': sections.get('technical_approach', 'The paper presents a well-designed technical framework with clear implementation details.'),
                'significance': sections.get('significance_&_impact', 'This work contributes valuable insights to the field and opens new research directions.'),
                'limitations': sections.get('limitations_&_future_work', 'The study acknowledges several limitations and suggests promising future research directions.'),
                'technical_difficulty': technical_difficulty,
                'target_audience': sections.get('target_audience', 'Researchers and practitioners in the relevant field.')
            }
            
        except Exception as e:
            logger.error(f"Error parsing analysis response: {e}")
            return self._generate_fallback_analysis("", "", [], [])
    
    def _generate_fallback_analysis(self, title: str, abstract: str, authors: List[str], categories: List[str]) -> Dict:
        """Generate basic analysis when AI analysis fails"""
        return {
            'executive_summary': f"This paper presents research in {', '.join(categories[:2])} with contributions from {len(authors)} author(s). The work addresses important challenges in the field.",
            'key_contributions': [
                'Novel approach to existing problem',
                'Comprehensive experimental validation',
                'Improved performance over baseline methods'
            ],
            'methodology': 'The authors employed a systematic approach combining theoretical analysis with empirical validation.',
            'results': 'The proposed method demonstrates competitive performance across relevant benchmarks.',
            'technical_approach': 'The paper presents a well-structured technical framework with clear implementation details.',
            'significance': 'This work contributes valuable insights to the field and opens new research directions.',
            'limitations': 'The study acknowledges limitations and suggests promising future research directions.',
            'technical_difficulty': 3,
            'target_audience': f"Researchers and practitioners in {', '.join(categories[:2])}."
        }

def generate_paper_analysis(title: str, abstract: str, authors: List[str], categories: List[str], 
                          model: str = "llama-3.1-8b-instant-groq") -> Dict:
    """Convenience function to generate paper analysis"""
    analyzer = PaperAnalyzer(model)
    return analyzer.generate_detailed_analysis(title, abstract, authors, categories)