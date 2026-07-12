import { expect, test } from '@playwright/test';

test.describe('desktop intent', () => {
    test.skip(({ isMobile }) => Boolean(isMobile), 'desktop-only cursor behavior');

    test('fires once, resets, and never fires an off-screen drawer target', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('body')).toHaveAttribute('data-hydrated', 'true');
        const target = page.getByTestId('desktop-target');
        const box = await target.boundingBox();
        if (!box) throw new Error('desktop target has no layout box');

        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await expect(page.getByTestId('desktop-count')).toHaveText('1');
        await expect(page.getByTestId('hidden-count')).toHaveText('0');

        await page.mouse.move(900, 700);
        await page.waitForTimeout(100);
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await expect(page.getByTestId('desktop-count')).toHaveText('2');
        await expect(page.getByTestId('hidden-count')).toHaveText('0');
    });

    test('does not re-render a dense list during engine calculations', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('body')).toHaveAttribute('data-hydrated', 'true');
        const first = page.getByTestId('dense-0');
        await expect(first).toHaveAttribute('data-renders', /\d+/);
        await expect(page.getByTestId('dense-999')).toHaveAttribute('data-renders', /\d+/);
        await page.waitForFunction(() => {
            const scope = window as typeof window & { renderProbe?: { value: string | null; since: number } };
            const value = document.querySelector('[data-testid="dense-0"]')?.getAttribute('data-renders') ?? null;
            if (!scope.renderProbe || scope.renderProbe.value !== value) {
                scope.renderProbe = { value, since: performance.now() };
                return false;
            }
            return performance.now() - scope.renderProbe.since > 500;
        });
        const before = await first.getAttribute('data-renders');
        await page.mouse.move(500, 300);
        await page.mouse.move(650, 350, { steps: 10 });
        await page.waitForTimeout(150);
        await expect(first).toHaveAttribute('data-renders', before ?? '');
    });

    test('makes drawer and clipped carousel targets eligible only when revealed', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('body')).toHaveAttribute('data-hydrated', 'true');

        await page.mouse.move(90, 300);
        await expect(page.getByTestId('hidden-count')).toHaveText('0');
        await page.getByTestId('drawer-toggle').click();
        const drawerTarget = page.getByRole('link', { name: 'Hidden target' });
        const drawerBox = await drawerTarget.boundingBox();
        if (!drawerBox) throw new Error('opened drawer target has no layout box');
        await page.mouse.move(drawerBox.x + drawerBox.width / 2, drawerBox.y + drawerBox.height / 2);
        await expect(page.getByTestId('hidden-count')).toHaveText('1');

        await expect(page.getByTestId('carousel-count')).toHaveText('0');
        await page.getByTestId('carousel').evaluate((element) => { element.scrollLeft = 650; });
        const carouselTarget = page.getByTestId('carousel-target');
        const carouselBox = await carouselTarget.boundingBox();
        if (!carouselBox) throw new Error('revealed carousel target has no layout box');
        await page.mouse.move(carouselBox.x + carouselBox.width / 2, carouselBox.y + carouselBox.height / 2);
        await expect(page.getByTestId('carousel-count')).toHaveText('1');
    });

    test('does not use Next.js automatic prefetch', async ({ page }) => {
        const destinationRequests: string[] = [];
        page.on('request', (request) => {
            if (new URL(request.url()).pathname.startsWith('/destination/')) {
                destinationRequests.push(request.url());
            }
        });
        await page.goto('/');
        await expect(page.locator('body')).toHaveAttribute('data-hydrated', 'true');
        await page.getByTestId('dense-0').scrollIntoViewIfNeeded();
        await page.waitForTimeout(750);
        expect(destinationRequests).toEqual([]);
    });
});

test.describe('mobile intent', () => {
    test.skip(({ isMobile }) => !isMobile, 'mobile-only scroll behavior');

    test('fires for a visible scroll target but not the closed drawer', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('body')).toHaveAttribute('data-hydrated', 'true');
        await page.getByTestId('mobile-target').evaluate((element) => {
            const rect = element.getBoundingClientRect();
            const targetCenter = rect.top + rect.height / 2;
            window.scrollBy(0, targetCenter - window.innerHeight * 0.55);
        });
        await expect(page.getByTestId('mobile-count')).toHaveText('1');
        await expect(page.getByTestId('hidden-count')).toHaveText('0');
    });
});
