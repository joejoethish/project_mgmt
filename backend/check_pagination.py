import requests

# Check what pagination parameters work
test_urls = [
    'https://marketing.logimaxindia.com/api/webhook-logs/?full_raw_body=true&page=2',
    'https://marketing.logimaxindia.com/api/webhook-logs/?full_raw_body=true&offset=50',
    'https://marketing.logimaxindia.com/api/webhook-logs/?full_raw_body=true&limit=100',
    'https://marketing.logimaxindia.com/api/webhook-logs/?full_raw_body=true&page_size=100',
]

for url in test_urls:
    try:
        r = requests.get(url, timeout=10)
        d = r.json()
        print(f"URL: {url.split('?')[1]}")
        print(f"  Results: {len(d.get('results', []))}")
        print()
    except Exception as e:
        print(f"URL: {url.split('?')[1]} - Error: {e}")
