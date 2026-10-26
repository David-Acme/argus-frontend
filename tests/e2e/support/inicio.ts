import type { Page } from 'playwright-core';

export const UPCOMING = 'Upcoming reminders';

export const WIDE = { width: 1920, height: 1080 };

export const rowIn = (page: Page, section: string, title: string): Promise<string> =>
  page.evaluate(
    ({ heading, name }) => {
      const headingOf = (row: Element): string => {
        let node = row.parentElement;
        while (node && !node.querySelector('[role="heading"], h1, h2, h3'))
          node = node.parentElement;
        return node?.querySelector('[role="heading"], h1, h2, h3')?.textContent ?? '';
      };
      const rows = [...document.querySelectorAll('[role="button"][aria-label]')].filter((row) =>
        (row.getAttribute('aria-label') ?? '').startsWith(`${name}, `)
      );
      const row = rows.find((candidate) => headingOf(candidate) === heading);
      return row?.getAttribute('aria-label') ?? '';
    },
    { heading: section, name: title }
  );
