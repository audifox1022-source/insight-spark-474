import { test, expect } from '@playwright/test';

test.describe('인증 플로우', () => {
  test('로그인 페이지가 로드된다', async ({ page }) => {
    await page.goto('/auth');
    await expect(page).toHaveTitle(/WorkAI|InsightSpark/);
    await expect(page.locator('text=환영합니다')).toBeVisible();
  });

  test('이메일/비밀번호 입력 필드가 존재한다', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('회원가입/로그인 전환이 작동한다', async ({ page }) => {
    await page.goto('/auth');
    await page.click('text=회원가입');
    await expect(page.locator('text=무료 계정 만들기')).toBeVisible();
  });
});

test.describe('404 페이지', () => {
  test('존재하지 않는 경로에서 404 표시', async ({ page }) => {
    await page.goto('/nonexistent-page');
    await expect(page.locator('text=404')).toBeVisible();
    await expect(page.locator('text=페이지를 찾을 수 없습니다')).toBeVisible();
  });

  test('홈 링크가 작동한다', async ({ page }) => {
    await page.goto('/nonexistent-page');
    await page.click('text=홈으로 돌아가기');
    await expect(page).toHaveURL(/\/auth/);
  });
});
