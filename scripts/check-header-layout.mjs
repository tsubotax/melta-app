// カタログのHeaderを実描画し、slotが大きくなっても余白と操作領域が保たれることを確認する。
// Webでの文字拡大はOSのDynamic TypeやVoiceOver実機確認の代替ではない。
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const args = process.argv.slice(2);
const arg = (key, fallback) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
const require = createRequire(import.meta.url);
const { chromium } = require(arg("--playwright-module", "playwright"));
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const width of [320, 393]) {
    const page = await browser.newPage({ viewport: { width: width + 32, height: 852 } });
    await page.goto(arg("--base", "http://127.0.0.1:8130"));
    const bar = page.getByTestId("header-actions");
    await bar.waitFor();
    // カタログ外周の余白を除き、Header本体を実画面と同じ幅で測る。
    await bar.evaluate((el, width) => { el.style.width = `${width}px`; }, width);
    await bar.scrollIntoViewIfNeeded();
    for (const enlarged of [false, true]) {
      if (enlarged) await bar.evaluate(el => {
        // 子のレイアウトが大きい条件を作り、Headerの固定高による切れを検出する。
        for (const button of el.querySelectorAll('[role="button"]')) {
          button.style.minHeight = "64px";
          for (const text of button.querySelectorAll('[dir="auto"]')) {
            text.style.fontSize = "28px"; text.style.lineHeight = "45px";
          }
        }
      });
      const metrics = await bar.evaluate(el => {
        const rect = el.getBoundingClientRect(), style = getComputedStyle(el);
        const buttons = [...el.querySelectorAll('[role="button"]')].map(button => {
          const b = button.getBoundingClientRect();
          return { height: b.height, width: b.width, top: b.top - rect.top,
            bottom: rect.bottom - b.bottom - parseFloat(style.borderBottomWidth),
            left: b.left - rect.left, right: rect.right - b.right, x: b.left, end: b.right };
        });
        return { width: rect.width, height: rect.height, padding: parseFloat(style.paddingTop), paddingX: parseFloat(style.paddingLeft), buttons };
      });
      assert.equal(metrics.width, width);
      assert.equal(metrics.buttons.length, 3);
      assert.equal(metrics.padding, 12);
      for (const b of metrics.buttons) {
        assert.ok(b.height >= 44 && b.width >= 44, JSON.stringify({ width, enlarged, b }));
        assert.ok(b.top >= 12 && b.bottom >= 12, JSON.stringify({ width, enlarged, b }));
        assert.ok(b.left >= metrics.paddingX - 0.1 && b.right >= metrics.paddingX - 0.1, JSON.stringify({ width, enlarged, b }));
      }
      for (let i = 1; i < metrics.buttons.length; i++) {
        assert.ok(metrics.buttons[i - 1].end <= metrics.buttons[i].x, JSON.stringify({ width, enlarged, metrics }));
      }
      assert.ok(await bar.getByRole("heading", { name: "作業ログを残す" }).count() === 1);
      results.push({ enlarged, ...metrics });
    }
    for (const id of ["header-centered", "header-navigation-0", "header-navigation-1"]) {
      const centered = page.getByTestId(id);
      await centered.evaluate((el, width) => { el.style.width = `${width}px`; }, width);
      await centered.scrollIntoViewIfNeeded();
      const measure = () => centered.evaluate(el => {
        const box = r => ({ x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom });
        return { bar: box(el.getBoundingClientRect()),
          title: box(el.querySelector('[role="heading"]').getBoundingClientRect()),
          sides: [box(el.firstElementChild.getBoundingClientRect()), box(el.lastElementChild.getBoundingClientRect())],
          controls: [...el.querySelectorAll('[role="button"]')].map(b => box(b.getBoundingClientRect())) };
      });
      const check = m => {
        assert.ok(Math.abs(m.bar.x + m.bar.width / 2 - m.title.x - m.title.width / 2) < 0.75, JSON.stringify(m));
        assert.ok(m.title.x >= m.sides[0].right - 0.1 && m.title.right <= m.sides[1].x + 0.1, JSON.stringify(m));
        assert.ok(m.title.y >= m.bar.y - 0.1 && m.title.bottom <= m.bar.bottom + 0.1, JSON.stringify(m));
        assert.ok(m.sides.every(s => s.width >= 44), JSON.stringify(m));
        assert.ok(m.controls.every(c => c.width >= 44 && c.height >= 44 && c.x >= m.bar.x && c.right <= m.bar.right), JSON.stringify(m));
      };
      for (const enlarged of [false, true]) {
        if (enlarged) await centered.evaluate(el => {
          for (const text of el.querySelectorAll('[role="heading"] [dir="auto"]')) {
            text.style.fontSize = "28px"; text.style.lineHeight = "45px";
          }
        });
        const metrics = await measure();
        check(metrics);
        results.push({ id, width, enlarged, ...metrics });
      }
      // 計器自体が横ズレを落とすことを、実DOMの破壊で確認する。
      await centered.getByRole("heading").evaluate(el => { el.style.transform = "translateX(8px)"; });
      const broken = await measure();
      assert.throws(() => check(broken));
      await centered.getByRole("heading").evaluate(el => { el.style.transform = ""; });
    }
    await page.close();
  }
  console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); }
