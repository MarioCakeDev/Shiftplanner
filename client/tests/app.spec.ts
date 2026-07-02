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

test.describe("Shiftplanner", () => {
  test.beforeEach(async ({ page }) => {
    await cleanup(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("loads the app and shows header", async ({ page }) => {
    await expect(page.locator("h1")).toHaveText("Schichtplan");
  });

  test("shows the dev user name and action buttons", async ({ page }) => {
    await expect(page.getByLabel("Profile menu")).toBeVisible();
    await expect(page.getByText("DU")).toBeVisible();
    await page.getByLabel("Profile menu").click();
    await expect(page.getByText("Dev User")).toBeVisible();
    await page.getByLabel("Profile menu").click();
    await expect(page.getByText("Copy iCal URL")).toBeVisible();
    await expect(page.getByText("Download")).toBeVisible();
  });

  test("shows month navigation controls", async ({ page }) => {
    const monthButton = page.locator("button").filter({ hasText: /January|February|March|April|May|June|July|August|September|October|November|December/ });
    await expect(monthButton.first()).toBeVisible();

    const prevButton = page.locator("button").filter({ hasText: "‹" });
    const nextButton = page.locator("button").filter({ hasText: "›" });
    await expect(prevButton).toBeVisible();
    await expect(nextButton).toBeVisible();
  });

  test("shows calendar with day headers", async ({ page }) => {
    const dayHeaders = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    for (const day of dayHeaders) {
      await expect(page.getByText(day, { exact: true })).toBeVisible();
    }
  });

  test("shows the add shift button", async ({ page }) => {
    await expect(page.getByText("+ Add Shift")).toBeVisible();
  });

  test("can open and cancel the add shift form", async ({ page }) => {
    await page.getByText("+ Add Shift").click();
    await expect(page.getByPlaceholder("Shift name")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save" })).toBeVisible();

    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByPlaceholder("Shift name")).not.toBeVisible();
  });

  test("can create a shift template", async ({ page }) => {
    await page.getByText("+ Add Shift").click();

    await page.getByPlaceholder("Shift name").fill("Morning Shift");
    await page.locator('input[type="time"]').first().fill("06:00");
    await page.locator('input[type="time"]').nth(1).fill("14:00");

    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Morning Shift")).toBeVisible();
  });

  test("can arm a template and see the instruction text", async ({ page }) => {
    await page.getByText("+ Add Shift").click();
    await page.getByPlaceholder("Shift name").fill("Test Shift");
    await page.getByRole("button", { name: "Save" }).click();
    await page.waitForTimeout(500);

    await page.getByRole("button", { name: /^Test Shift/ }).click();
    await expect(page.getByText(/Click day cells or drag/)).toBeVisible();
  });

  test("can create a shift template and apply it to a date", async ({ page }) => {

    await page.getByText("+ Add Shift").click();
    await page.getByPlaceholder("Shift name").fill("Work Shift");
    await page.getByRole("button", { name: "Save" }).click();
    await page.waitForTimeout(500);

    await page.getByRole("button", { name: /^Work Shift/ }).click();
    await page.waitForTimeout(200);

    const cells = page.locator("[data-date]");
    const firstCell = cells.first();
    await expect(firstCell).toBeVisible();
    await firstCell.click();

    await page.waitForTimeout(500);
    await expect(page.getByRole("button", { name: /^Work Shift/ })).toBeVisible();
  });
});

test.describe("Profile & iCal", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  });

  test("profile dropdown shows initials and toggles on click", async ({ page }) => {
    await expect(page.getByLabel("Profile menu")).toBeVisible();
    await expect(page.getByText("DU")).toBeVisible();

    await page.getByLabel("Profile menu").click();
    await expect(page.getByText("Dev User")).toBeVisible();

    await page.getByLabel("Profile menu").click();
    await expect(page.getByText("Dev User")).not.toBeVisible();
  });

  test("profile dropdown closes on click outside", async ({ page }) => {
    await page.getByLabel("Profile menu").click();
    await expect(page.getByText("Dev User")).toBeVisible();

    await page.locator("h1").click();
    await expect(page.getByText("Dev User")).not.toBeVisible();
  });

  test("shows Copy iCal URL and Download buttons below calendar", async ({ page }) => {
    await expect(page.getByText("Copy iCal URL")).toBeVisible();
    await expect(page.getByText("Download")).toBeVisible();
  });

  test("copy button shows Copied! indicator for 2 seconds", async ({ page }) => {
    await expect(page.getByText("Copy iCal URL")).toBeVisible();

    await page.getByText("Copy iCal URL").click();
    await expect(page.getByText("Copied!")).toBeVisible();

    await page.waitForTimeout(2500);
    await expect(page.getByText("Copy iCal URL")).toBeVisible();
  });

  test("download button triggers ics file download", async ({ page }) => {
    const downloadPromise = page.waitForEvent("download");
    await page.getByText("Download").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("schichtplan.ics");
  });
});
