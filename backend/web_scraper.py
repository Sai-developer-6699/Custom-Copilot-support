import requests
from bs4 import BeautifulSoup
import os
import time
from pathlib import Path
import json
from urllib.parse import urljoin, urlparse
import re

class AtlanDocsScraper:
    def __init__(self, base_url, output_dir="scraped_data"):
        self.base_url = base_url
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        self.visited_urls = set()
        self.scraped_content = []
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
    
    def is_valid_url(self, url):
        """Check if URL is valid and belongs to the same domain"""
        try:
            parsed = urlparse(url)
            base_parsed = urlparse(self.base_url)
            return (
                parsed.netloc == base_parsed.netloc and
                not any(ext in url.lower() for ext in ['.pdf', '.jpg', '.png', '.gif', '.css', '.js']) and
                '#' not in url
            )
        except:
            return False
    
    def clean_text(self, text):
        """Clean and normalize text content"""
        if not text:
            return ""
        
        # Remove extra whitespace and normalize
        text = re.sub(r'\s+', ' ', text.strip())
        
        # Remove common navigation elements
        text = re.sub(r'(Skip to main content|Table of contents|Navigation|Menu)', '', text, flags=re.IGNORECASE)
        
        return text
    
    def extract_content(self, soup, url):
        """Extract main content from the page"""
        content = {
            'url': url,
            'title': '',
            'content': '',
            'sections': [],
            'code_blocks': [],
            'links': []
        }
        
        # Extract title
        title_elem = soup.find('title') or soup.find('h1')
        if title_elem:
            content['title'] = self.clean_text(title_elem.get_text())
        
        # Extract main content (try different selectors)
        main_selectors = [
            'main',
            '[role="main"]',
            '.main-content',
            '.content',
            '.documentation',
            'article',
            '.markdown-body'
        ]
        
        main_content = None
        for selector in main_selectors:
            main_content = soup.select_one(selector)
            if main_content:
                break
        
        if not main_content:
            main_content = soup.find('body')
        
        if main_content:
            # Extract text content
            content['content'] = self.clean_text(main_content.get_text())
            
            # Extract sections (headings)
            headings = main_content.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
            for heading in headings:
                section_text = self.clean_text(heading.get_text())
                if section_text and len(section_text) > 3:
                    content['sections'].append({
                        'level': int(heading.name[1]),
                        'text': section_text
                    })
            
            # Extract code blocks
            code_blocks = main_content.find_all(['code', 'pre'])
            for code in code_blocks:
                code_text = self.clean_text(code.get_text())
                if code_text and len(code_text) > 10:
                    content['code_blocks'].append(code_text)
            
            # Extract internal links
            links = main_content.find_all('a', href=True)
            for link in links:
                href = link.get('href')
                full_url = urljoin(url, href)
                if self.is_valid_url(full_url):
                    content['links'].append({
                        'text': self.clean_text(link.get_text()),
                        'url': full_url
                    })
        
        return content
    
    def scrape_page(self, url):
        """Scrape a single page"""
        if url in self.visited_urls:
            return None
        
        try:
            print(f"Scraping: {url}")
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            content = self.extract_content(soup, url)
            
            self.visited_urls.add(url)
            self.scraped_content.append(content)
            
            return content
            
        except Exception as e:
            print(f"Error scraping {url}: {str(e)}")
            return None
    
    def find_all_links(self, soup, base_url):
        """Find all internal links on the page"""
        links = []
        for link in soup.find_all('a', href=True):
            href = link.get('href')
            full_url = urljoin(base_url, href)
            if self.is_valid_url(full_url):
                links.append(full_url)
        return links
    
    def scrape_site(self, max_pages=50, delay=1):
        """Scrape the entire site starting from base URL"""
        urls_to_visit = [self.base_url]
        
        while urls_to_visit and len(self.visited_urls) < max_pages:
            current_url = urls_to_visit.pop(0)
            
            if current_url in self.visited_urls:
                continue
            
            content = self.scrape_page(current_url)
            
            if content:
                # Add new links to visit
                new_links = [link['url'] for link in content['links']]
                for link in new_links:
                    if link not in self.visited_urls and link not in urls_to_visit:
                        urls_to_visit.append(link)
            
            # Be respectful - add delay between requests
            time.sleep(delay)
        
        return self.scraped_content
    
    def save_content(self, filename=None):
        """Save scraped content to files"""
        if not filename:
            domain = urlparse(self.base_url).netloc.replace('.', '_')
            filename = f"{domain}_scraped_content.json"
        
        output_file = self.output_dir / filename
        
        # Save as JSON
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(self.scraped_content, f, indent=2, ensure_ascii=False)
        
        # Save as text file for easy reading
        text_file = self.output_dir / f"{filename.replace('.json', '.txt')}"
        with open(text_file, 'w', encoding='utf-8') as f:
            for content in self.scraped_content:
                f.write(f"URL: {content['url']}\n")
                f.write(f"Title: {content['title']}\n")
                f.write(f"Content: {content['content']}\n")
                f.write("-" * 80 + "\n\n")
        
        print(f"Content saved to {output_file} and {text_file}")
        return output_file

def scrape_atlan_docs():
    """Scrape Atlan documentation sites"""
    
    # Scrape Product docs
    print("Scraping Atlan Product Documentation...")
    product_scraper = AtlanDocsScraper("https://docs.atlan.com/", "scraped_data/product_docs")
    product_content = product_scraper.scrape_site(max_pages=30, delay=1)
    product_file = product_scraper.save_content("atlan_product_docs.json")
    
    # Scrape API/SDK docs
    print("Scraping Atlan API/SDK Documentation...")
    api_scraper = AtlanDocsScraper("https://developer.atlan.com/", "scraped_data/api_docs")
    api_content = api_scraper.scrape_site(max_pages=30, delay=1)
    api_file = api_scraper.save_content("atlan_api_docs.json")
    
    print(f"Scraping completed!")
    print(f"Product docs: {len(product_content)} pages")
    print(f"API docs: {len(api_content)} pages")
    
    return {
        'product_docs': product_file,
        'api_docs': api_file,
        'product_pages': len(product_content),
        'api_pages': len(api_content)
    }

if __name__ == "__main__":
    result = scrape_atlan_docs()
    print(f"Results: {result}")
