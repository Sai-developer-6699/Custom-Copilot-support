import requests
from bs4 import BeautifulSoup
import os
import time
from pathlib import Path
import json
from urllib.parse import urljoin, urlparse
import re

class AtlanDocsScraper:
    def __init__(self, base_url, output_dir=None):
        self.base_url = self.normalize_url(base_url)
        if output_dir is None:
            output_dir = Path(__file__).resolve().parent / "scraped_data"
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True, parents=True)
        self.visited_urls = set()
        self.failed_urls = set()
        self.skipped_urls = set()
        self.discovered_urls = set()
        self.queue = []
        self.scraped_content = []
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })

    def normalize_url(self, url):
        """Normalize URLs to prevent duplicate indexing across trailing slashes/hashes"""
        try:
            parsed = urlparse(url)
            netloc = parsed.netloc.lower()
            path = parsed.path
            
            # strip trailing slash if not root
            if path.endswith('/') and len(path) > 1:
                path = path[:-1]
                
            # rebuild url without query parameters or hash segments
            normalized = f"{parsed.scheme}://{netloc}{path}"
            return normalized
        except Exception:
            return url

    def is_valid_url(self, url):
        """Check if URL belongs to the same domain and is crawlable"""
        try:
            parsed = urlparse(url)
            base_parsed = urlparse(self.base_url)
            
            # Check scheme
            if parsed.scheme not in ('http', 'https'):
                return False
                
            # Ensure domain matches
            if parsed.netloc.lower() != base_parsed.netloc.lower():
                return False
                
            # Filter out assets and external links
            if any(ext in url.lower() for ext in ['.pdf', '.jpg', '.png', '.gif', '.css', '.js', '.zip', '.tar.gz']):
                return False
                
            # Filter out category, tags, and page indexes which pollute RAG with noise lists
            if any(pattern in url.lower() for pattern in ['/tags/', '/category/', '/categories/', '/page/']):
                return False

            return True
        except Exception:
            return False

    def fetch_with_retry(self, url, max_retries=3, backoff_factor=1.0):
        """Fetch URL with exponential backoff on timeouts or HTTP 429 rate limit states"""
        for attempt in range(max_retries):
            try:
                response = self.session.get(url, timeout=10)
                if response.status_code == 429:
                    sleep_time = backoff_factor * (2 ** attempt)
                    print(f"[RETRY] Rate limited (429) on {url}. Retrying in {sleep_time:.1f}s...")
                    time.sleep(sleep_time)
                    continue
                return response
            except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as e:
                sleep_time = backoff_factor * (2 ** attempt)
                print(f"[RETRY] Timeout/Connection error on {url} (attempt {attempt+1}/{max_retries}). Retrying in {sleep_time:.1f}s...")
                time.sleep(sleep_time)
                if attempt == max_retries - 1:
                    raise e
        return None

    def fetch_sitemap_urls(self):
        """Fetch URLs from XML sitemaps to catch orphan or deep pagination nodes, supporting nested sitemaps."""
        sitemap_urls = []
        sitemap_paths = ["sitemap.xml", "docs-sitemap.xml", "sitemap-docs.xml"]
        visited_sitemaps = set()
        
        # Queue to handle nested sitemaps
        sitemap_queue = [urljoin(self.base_url, path) for path in sitemap_paths]
        
        while sitemap_queue:
            sitemap_url = sitemap_queue.pop(0)
            if sitemap_url in visited_sitemaps:
                continue
            visited_sitemaps.add(sitemap_url)
            
            try:
                # Use fetch_with_retry to be resilient to network transient errors/rate limits
                response = self.fetch_with_retry(sitemap_url)
                if response and response.status_code == 200:
                    # Find all loc tags in this sitemap
                    locs = re.findall(r'<loc>(.*?)</loc>', response.text, re.DOTALL)
                    extracted_count = 0
                    for loc in locs:
                        loc_url = loc.strip()
                        # If loc is another XML sitemap, add it to the queue to parse
                        if loc_url.endswith('.xml') or 'sitemap' in loc_url.lower():
                            if loc_url not in visited_sitemaps:
                                sitemap_queue.append(loc_url)
                        else:
                            normalized = self.normalize_url(loc_url)
                            if self.is_valid_url(normalized):
                                sitemap_urls.append(normalized)
                                extracted_count += 1
                    print(f"[SITEMAP] Extracted {extracted_count} page URLs from sitemap: {sitemap_url}")
            except Exception as e:
                print(f"[SITEMAP] Error fetching/parsing sitemap {sitemap_url}: {e}")
                
        # Deduplicate while preserving order
        unique_urls = []
        seen = set()
        for url in sitemap_urls:
            if url not in seen:
                seen.add(url)
                unique_urls.append(url)
        return unique_urls

    def clean_text(self, text):
        """Clean and normalize whitespaces"""
        if not text:
            return ""
        return re.sub(r'\s+', ' ', text).strip()

    def parse_element_to_markdown(self, element):
        """Recursively traverse HTML nodes to extract sequential Markdown in natural reading order"""
        if not element:
            return ""
            
        from bs4 import NavigableString
        if isinstance(element, NavigableString):
            cleaned = self.clean_text(str(element))
            return cleaned if cleaned else ""
            
        if element.name in ['script', 'style', 'noscript', 'iframe', 'header', 'footer', 'nav']:
            return ""
            
        name = element.name
        
        # Format headings
        if name in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
            level = int(name[1])
            text = self.clean_text(element.get_text())
            return f"\n\n{'#' * level} {text}\n"
            
        # Format paragraphs
        elif name == 'p':
            text = self.clean_text(element.get_text())
            return f"\n\n{text}\n"
            
        # Format list elements
        elif name in ['ul', 'ol']:
            parts = []
            for li in element.find_all('li', recursive=False):
                li_text = self.clean_text(li.get_text())
                if li_text:
                    parts.append(f"* {li_text}")
            return "\n" + "\n".join(parts) + "\n"
            
        # Format code blocks
        elif name == 'pre' or name == 'code':
            code_text = element.get_text().strip()
            # If code is nested inside pre, skip inner code parsing to avoid duplicating
            if name == 'code' and element.parent.name == 'pre':
                return code_text
            return f"\n\n```\n{code_text}\n```\n"
            
        # Format tables
        elif name == 'table':
            rows = []
            for tr in element.find_all('tr', recursive=False):
                cells = [self.clean_text(cell.get_text()) for cell in tr.find_all(['td', 'th'], recursive=False)]
                if any(cells):
                    rows.append("| " + " | ".join(cells) + " |")
            if rows:
                header_cols_count = len(rows[0].split('|')) - 2
                separator = "| " + " | ".join(["---"] * max(header_cols_count, 1)) + " |"
                if len(rows) > 1:
                    rows.insert(1, separator)
                return "\n\n" + "\n".join(rows) + "\n"
                
        # Recurse children sequentially
        parts = []
        for child in element.children:
            child_md = self.parse_element_to_markdown(child)
            if child_md:
                parts.append(child_md)
                
        return " ".join(parts)

    def extract_content(self, soup, url):
        """Extract main content from page and output as Markdown"""
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
            
        # Selectors to extract main content block
        main_selectors = [
            'main', '[role="main"]', '.main-content', '.content', 
            '.documentation', 'article', '.markdown-body'
        ]
        
        main_content = None
        for selector in main_selectors:
            main_content = soup.select_one(selector)
            if main_content:
                break
        if not main_content:
            main_content = soup.find('body')
            
        if main_content:
            # Reconstruct elements sequentially as markdown
            content['content'] = self.parse_element_to_markdown(main_content).strip()
            
            # Extract section structures
            headings = main_content.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
            for heading in headings:
                section_text = self.clean_text(heading.get_text())
                if section_text and len(section_text) > 3:
                    content['sections'].append({
                        'level': int(heading.name[1]),
                        'text': section_text
                    })
                    
            # Extract raw code blocks
            code_blocks = main_content.find_all('pre')
            for code in code_blocks:
                code_text = code.get_text().strip()
                if code_text and len(code_text) > 10:
                    content['code_blocks'].append(code_text)
                    
        # Global Link Discovery: scan the entire soup tree to catch sidebar/pagination links
        links = soup.find_all('a', href=True)
        for link in links:
            href = link.get('href')
            full_url = urljoin(url, href)
            normalized = self.normalize_url(full_url)
            if self.is_valid_url(normalized):
                content['links'].append({
                    'text': self.clean_text(link.get_text()),
                    'url': normalized
                })
                self.discovered_urls.add(normalized)
                
        return content

    def scrape_page(self, url):
        """Scrape a single page with performance logs"""
        if url in self.visited_urls:
            return None
            
        try:
            start_time = time.perf_counter()
            response = self.fetch_with_retry(url)
            duration_ms = (time.perf_counter() - start_time) * 1000
            
            if not response or response.status_code != 200:
                status = response.status_code if response else "Failed"
                print(f"[FAILED] {url} | status={status} | duration={duration_ms:.1f}ms")
                self.failed_urls.add(url)
                return None
                
            soup = BeautifulSoup(response.content, 'html.parser')
            content = self.extract_content(soup, url)
            
            self.visited_urls.add(url)
            self.scraped_content.append(content)
            
            # Print page telemetry log
            char_count = len(content['content'])
            links_found = len(content['links'])
            print(f"[SCRAPED] {url} | status={response.status_code} | chars={char_count} | links={links_found} | duration={duration_ms:.1f}ms")
            
            return content
        except Exception as e:
            print(f"[FAILED] Error scraping {url}: {str(e)}")
            self.failed_urls.add(url)
            return None

    def prioritize_queue(self):
        """Sort the queue so that high-priority URLs are crawled first and low-priority are crawled last."""
        high_priority_patterns = [
            "/troubleshooting/", "/api/", "/sdk/", "/guides/", "/reference/", 
            "/errors/", "/authentication/", "/setup/", "/configuration/", "/capabilities/", "/build-apps/"
        ]
        low_priority_patterns = [
            "/changelog/", "/release-notes/", "/deprecated/", "/archive/", 
            "/community/", "/examples/", "/apps/connectors/"
        ]
        
        def get_priority_score(url):
            url_lower = url.lower()
            for pattern in low_priority_patterns:
                if pattern in url_lower:
                    return 2  # Low priority (process last)
            for pattern in high_priority_patterns:
                if pattern in url_lower:
                    return 0  # High priority (process first)
            return 1  # Medium priority (default)

        self.queue.sort(key=get_priority_score)

    def scrape_site(self, max_pages=350, delay=1.0):
        """Scrape site using breadth-first queue, prioritizing high-value documentation paths"""
        # Load sitemap URLs as crawler seeds if available
        sitemap_seeds = self.fetch_sitemap_urls()
        for seed in sitemap_seeds:
            if seed not in self.discovered_urls:
                self.discovered_urls.add(seed)
                self.queue.append(seed)
                
        # Ensure our queue is seeded
        if self.base_url not in self.discovered_urls:
            self.discovered_urls.add(self.base_url)
            self.queue.insert(0, self.base_url)
            
        self.prioritize_queue()
            
        while self.queue and len(self.visited_urls) < max_pages:
            current_url = self.queue.pop(0)
            if current_url in self.visited_urls or current_url in self.failed_urls:
                continue
                
            content = self.scrape_page(current_url)
            if content:
                # Add newly discovered page links to queue
                new_links_added = False
                for link in content['links']:
                    target = link['url']
                    if target not in self.visited_urls and target not in self.failed_urls and target not in self.queue:
                        self.queue.append(target)
                        new_links_added = True
                        
                if new_links_added:
                    self.prioritize_queue()
                        
            time.sleep(delay)
            
        # Collect remaining unvisited queue pages as skipped urls
        for remaining in self.queue:
            if remaining not in self.visited_urls and remaining not in self.failed_urls:
                self.skipped_urls.add(remaining)
                
        return self.scraped_content

    def save_content(self, filename=None):
        """Save scraped JSON and plain text content"""
        if not filename:
            domain = urlparse(self.base_url).netloc.replace('.', '_')
            filename = f"{domain}_scraped_content.json"
            
        output_file = self.output_dir / filename
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(self.scraped_content, f, indent=2, ensure_ascii=False)
            
        text_file = self.output_dir / f"{filename.replace('.json', '.txt')}"
        with open(text_file, 'w', encoding='utf-8') as f:
            for content in self.scraped_content:
                f.write(f"URL: {content['url']}\n")
                f.write(f"Title: {content['title']}\n")
                f.write(f"Content:\n{content['content']}\n")
                f.write("-" * 80 + "\n\n")
                
        return output_file

def scrape_atlan_docs():
    """Main scrape orchestration across product and developer docs"""
    
    # 1. Scrape Product docs
    print("Scraping Atlan Product Documentation...")
    product_scraper = AtlanDocsScraper("https://docs.atlan.com/", "scraped_data/product_docs")
    
    # Seed explicitly with the locking issue page so it's crawled first
    locking_url = "https://docs.atlan.com/product/capabilities/build-apps/sdks/application-sdk/troubleshooting/distributed-locking-issues"
    product_scraper.queue.append(locking_url)
    product_scraper.discovered_urls.add(locking_url)
    
    product_content = product_scraper.scrape_site(max_pages=350, delay=1.0)
    product_file = product_scraper.save_content("atlan_product_docs.json")
    
    # 2. Scrape API/SDK docs
    print("\nScraping Atlan API/SDK Documentation...")
    api_scraper = AtlanDocsScraper("https://developer.atlan.com/", "scraped_data/api_docs")
    api_content = api_scraper.scrape_site(max_pages=350, delay=1.0)
    api_file = api_scraper.save_content("atlan_api_docs.json")
    
    # 3. Compile Unified Audit Coverage Report
    coverage_file = Path("scraped_data/crawl_coverage.json")
    discovered = len(product_scraper.discovered_urls) + len(api_scraper.discovered_urls)
    visited = len(product_scraper.visited_urls) + len(api_scraper.visited_urls)
    failed_list = list(product_scraper.failed_urls) + list(api_scraper.failed_urls)
    skipped_list = sorted(list(product_scraper.skipped_urls | api_scraper.skipped_urls))
    skipped = len(skipped_list)
    
    coverage_report = {
        "discovered_urls": discovered,
        "visited_urls": visited,
        "failed_urls": len(failed_list),
        "failed_urls_count": len(failed_list),
        "failed_url_list": failed_list,
        "skipped_urls_count": skipped,
        "pages_by_type": {
            "product_docs": len(product_content),
            "api_docs": len(api_content)
        }
    }
    
    with open(coverage_file, 'w', encoding='utf-8') as f:
        json.dump(coverage_report, f, indent=2, ensure_ascii=False)
        
    skipped_file = Path("scraped_data/skipped_urls.json")
    with open(skipped_file, 'w', encoding='utf-8') as f:
        json.dump(skipped_list, f, indent=2, ensure_ascii=False)
        
    print(f"\n[COVERAGE] Audit saved to: {coverage_file}")
    print(f"[COVERAGE] Skipped URLs saved to: {skipped_file}")
    print(f"Total Discovered: {discovered} | Crawled: {visited} | Failed: {len(failed_list)} | Skipped: {skipped}")
    
    return {
        'product_docs': product_file,
        'api_docs': api_file,
        'product_pages': len(product_content),
        'api_pages': len(api_content)
    }

if __name__ == "__main__":
    result = scrape_atlan_docs()
    print(f"Results: {result}")
