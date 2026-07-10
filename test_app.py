import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        await page.goto('http://localhost:3000')
        await page.evaluate("localStorage.setItem('admin_token', 'fake_token');")
        await page.goto('http://localhost:3000')
        
        try:
            await page.wait_for_selector('text=Spot News Admin', timeout=5000)
            print("Dashboard loaded")
            
            await page.click('button:has-text("Withdrawals")')
            await page.wait_for_timeout(2000)
            
            content = await page.content()
            if "404" in content or "Not Found" in content:
                print("Found 404 in content!")
            else:
                print("No 404 found. Page loaded successfully.")
                element = await page.query_selector('h1.text-2xl')
                if element:
                    print("Active view title:", await element.inner_text())
        except Exception as e:
            print("Error during playwright run:", e)
            
        await browser.close()

asyncio.run(main())
