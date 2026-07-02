import { test, expect, type Page } from "@playwright/test";

async function cleanup(page: Page) {
  const templates: Array<{ id: string }> = await page.request
    .get("/api/templates")
    .then((r) => r.json())
    .catch(() => []);
  for (const t of templates) {
    await page.request.delete(`/api/templates/${t.id}`).catch(() => {});
  }
}

async function createTemplate(page: Page, name: string) {
  await page.getByText("+ Add Shift").click();
  await page.getByPlaceholder("Shift name").fill(name);
  await page.locator('input[type="time"]').first().fill("08:00");
  await page.locator('input[type="time"]').nth(1).fill("16:00");
  await page.getByRole("button", { name: "Save" }).click();
  await page.waitForTimeout(400);
}

async function armTemplate(page: Page, name: string) {
  await page.getByRole("button", { name: new RegExp(`^${escapeRegex(name)}`) }).click();
  await page.waitForTimeout(200);
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cell(page: Page, index: number) {
  return page.locator("[data-date]").nth(index);
}

test.describe("Drag and Drop", () => {
  test.beforeEach(async ({ page }) => {
    await cleanup(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("single click on empty cell without armed template opens selector", async ({ page }) => {
    await cell(page, 20).click();
    await page.waitForTimeout(300);
    await expect(page.getByRole("heading", { name: "Select a Shift" })).toBeVisible();
  });

  test("single click with armed template creates shift via API", async ({ page }) => {
    await createTemplate(page, "ClickShift");
    await armTemplate(page, "ClickShift");

    const responsePromise = page.waitForResponse(
      (res) => res.url().includes("/api/shifts/batch") && res.status() === 200,
    );
    await cell(page, 5).click();
    const response = await responsePromise;
    const body = await response.json();
    expect(body.created).toBe(1);
  });

  test("drag armed template across cells creates shifts via API", async ({ page }) => {
    await createTemplate(page, "MultiDrag");
    await armTemplate(page, "MultiDrag");

    const cells = page.locator("[data-date]");
    const count = await cells.count();
    const idxA = 7;
    const idxB = Math.min(count - 1, 13);

    const boxA = await cell(page, idxA).boundingBox();
    const boxB = await cell(page, idxB).boundingBox();
    expect(boxA).toBeTruthy();
    expect(boxB).toBeTruthy();

    const responsePromise = page.waitForResponse(
      (res) => res.url().includes("/api/shifts/batch") && res.status() === 200,
    );

    await page.mouse.move(boxA!.x + boxA!.width / 2, boxA!.y + boxA!.height / 2);
    await page.mouse.down();
    await page.mouse.move(boxB!.x + boxB!.width / 2, boxB!.y + boxB!.height / 2, { steps: 10 });
    await page.mouse.up();

    const response = await responsePromise;
    const body = await response.json();
    expect(body.created).toBeGreaterThan(0);
  });

  test("drag without armed template opens shift selector", async ({ page }) => {
    const cells = page.locator("[data-date]");
    const count = await cells.count();
    const idxA = 2;
    const idxB = Math.min(count - 1, 9);

    const boxA = await cell(page, idxA).boundingBox();
    const boxB = await cell(page, idxB).boundingBox();
    expect(boxA).toBeTruthy();
    expect(boxB).toBeTruthy();

    await page.mouse.move(boxA!.x + boxA!.width / 2, boxA!.y + boxA!.height / 2);
    await page.mouse.down();
    await page.mouse.move(boxB!.x + boxB!.width / 2, boxB!.y + boxB!.height / 2, { steps: 5 });
    await page.mouse.up();

    await page.waitForTimeout(500);
    await expect(page.getByRole("heading", { name: "Select a Shift" })).toBeVisible();
    await expect(page.getByText("+ Create New")).toBeVisible();
  });

  test("right-to-left drag creates shifts via API", async ({ page }) => {
    await createTemplate(page, "RTLDrag");
    await armTemplate(page, "RTLDrag");

    const idxLeft = 7;
    const idxRight = 14;

    const boxLeft = await cell(page, idxLeft).boundingBox();
    const boxRight = await cell(page, idxRight).boundingBox();
    expect(boxLeft).toBeTruthy();
    expect(boxRight).toBeTruthy();

    const responsePromise = page.waitForResponse(
      (res) => res.url().includes("/api/shifts/batch") && res.status() === 200,
    );

    // start on right cell, end on left
    await page.mouse.move(boxRight!.x + boxRight!.width / 2, boxRight!.y + boxRight!.height / 2);
    await page.mouse.down();
    await page.mouse.move(boxLeft!.x + boxLeft!.width / 2, boxLeft!.y + boxLeft!.height / 2, { steps: 10 });
    await page.mouse.up();

    const response = await responsePromise;
    const body = await response.json();
    expect(body.created).toBeGreaterThan(0);
  });

  test("drag across week boundary works", async ({ page }) => {
    await createTemplate(page, "WeekDrag");
    await armTemplate(page, "WeekDrag");

    // cell 7 = Monday of week 2, cell 11 = Friday of week 2
    const idxA = 7;
    const idxB = 11;

    const boxA = await cell(page, idxA).boundingBox();
    const boxB = await cell(page, idxB).boundingBox();
    expect(boxA).toBeTruthy();
    expect(boxB).toBeTruthy();

    const responsePromise = page.waitForResponse(
      (res) => res.url().includes("/api/shifts/batch") && res.status() === 200,
    );

    await page.mouse.move(boxA!.x + boxA!.width / 2, boxA!.y + boxA!.height / 2);
    await page.mouse.down();
    await page.mouse.move(boxB!.x + boxB!.width / 2, boxB!.y + boxB!.height / 2, { steps: 8 });
    await page.mouse.up();

    const response = await responsePromise;
    const body = await response.json();
    expect(body.created).toBeGreaterThan(0);
  });
});

test.describe("Touch Events", () => {
  test.beforeEach(async ({ page }) => {
    await cleanup(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  async function dispatchTouch(
    page: Page,
    targetIndex: number,
    type: "touchstart" | "touchmove" | "touchend",
    clientX: number,
    clientY: number,
  ) {
    await page.evaluate(
      ({ idx, evType, x, y }) => {
        const cells = document.querySelectorAll<HTMLElement>("[data-date]");
        const el = cells[idx];
        if (!el) return;
        const touch = new Touch({
          identifier: 1,
          target: el,
          clientX: x,
          clientY: y,
          pageX: x,
          pageY: y,
          radiusX: 2.5,
          radiusY: 2.5,
          rotationAngle: 0,
          force: 1,
        });
        const event = new TouchEvent(evType, {
          bubbles: true,
          cancelable: true,
          touches: evType === "touchend" ? [] : [touch],
          changedTouches: [touch],
        });
        el.dispatchEvent(event);
      },
      { idx: targetIndex, evType: type, x: clientX, y: clientY },
    );
  }

  async function touchAndWait(page: Page, cellIndex: number) {
    const cells = page.locator("[data-date]");
    const box = await cells.nth(cellIndex).boundingBox();
    expect(box).toBeTruthy();
    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;
    await dispatchTouch(page, cellIndex, "touchstart", cx, cy);
    await page.waitForTimeout(40);
    await dispatchTouch(page, cellIndex, "touchend", cx, cy);
  }

  async function touchDrag(page: Page, fromIndex: number, toIndex: number) {
    const cells = page.locator("[data-date]");
    const fromBox = await cells.nth(fromIndex).boundingBox();
    const toBox = await cells.nth(toIndex).boundingBox();
    expect(fromBox).toBeTruthy();
    expect(toBox).toBeTruthy();

    const startX = fromBox!.x + fromBox!.width / 2;
    const startY = fromBox!.y + fromBox!.height / 2;
    const endX = toBox!.x + toBox!.width / 2;
    const endY = toBox!.y + toBox!.height / 2;

    await dispatchTouch(page, fromIndex, "touchstart", startX, startY);
    await page.waitForTimeout(50);

    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      await dispatchTouch(page, fromIndex, "touchmove", startX + (endX - startX) * t, startY + (endY - startY) * t);
      await page.waitForTimeout(20);
    }

    await page.evaluate(
      ({ x, y }) => {
        const el = document.elementFromPoint(x, y);
        const dateCell = el?.closest<HTMLElement>("[data-date]");
        if (dateCell) {
          const touch = new Touch({
            identifier: 1,
            target: dateCell,
            clientX: x,
            clientY: y,
            pageX: x,
            pageY: y,
            radiusX: 2.5,
            radiusY: 2.5,
            rotationAngle: 0,
            force: 1,
          });
          dateCell.dispatchEvent(new TouchEvent("touchend", {
            bubbles: true, cancelable: true, touches: [], changedTouches: [touch],
          }));
        }
      },
      { x: endX, y: endY },
    );
  }

  test("touch tap with armed template creates shift via API", async ({ page }) => {
    await createTemplate(page, "TouchTap");
    await armTemplate(page, "TouchTap");

    const responsePromise = page.waitForResponse(
      (res) => res.url().includes("/api/shifts/batch") && res.status() === 200,
    );
    await touchAndWait(page, 5);
    await responsePromise;
  });

  test("touch drag across cells creates shifts via API", async ({ page }) => {
    await createTemplate(page, "TouchDragM");
    await armTemplate(page, "TouchDragM");

    const responsePromise = page.waitForResponse(
      (res) => res.url().includes("/api/shifts/batch") && res.status() === 200,
    );
    await touchDrag(page, 7, 14);
    const response = await responsePromise;
    const body = await response.json();
    expect(body.created).toBeGreaterThan(1);
  });

  test("touch tap on empty cell without armed template opens selector", async ({ page }) => {
    await touchAndWait(page, 20);
    await page.waitForTimeout(500);
    await expect(page.getByRole("heading", { name: "Select a Shift" })).toBeVisible();
  });

  test("touch drag without armed template opens selector", async ({ page }) => {
    await touchDrag(page, 3, 9);
    await page.waitForTimeout(500);
    await expect(page.getByRole("heading", { name: "Select a Shift" })).toBeVisible();
  });

  test("disarming template then tapping opens selector", async ({ page }) => {
    await createTemplate(page, "DisarmTest");
    await armTemplate(page, "DisarmTest");

    await page.getByRole("button", { name: /^DisarmTest/ }).click();
    await page.waitForTimeout(200);

    await touchAndWait(page, 6);
    await page.waitForTimeout(500);
    await expect(page.getByRole("heading", { name: "Select a Shift" })).toBeVisible();
  });
});
