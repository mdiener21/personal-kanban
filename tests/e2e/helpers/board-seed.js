import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function loadJsonFixture(relativePathFromWorkspace) {
  const filePath = join(process.cwd(), relativePathFromWorkspace);
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

export function buildSingleBoardFixture({
  boardId,
  boardName,
  columns,
  tasks,
  labels,
  settings,
  createdAt = '2026-02-01T00:00:00.000Z'
}) {
  return {
    boardId,
    boards: [{ id: boardId, name: boardName, createdAt }],
    columns,
    tasks,
    labels,
    settings
  };
}

export async function seedBoardFixture(page, fixture) {
  await page.evaluate((data) => {
    localStorage.clear();

    localStorage.setItem('kanbanBoards', JSON.stringify(data.boards));
    localStorage.setItem('kanbanActiveBoardId', data.boardId);
    localStorage.setItem(`kanbanBoard:${data.boardId}:columns`, JSON.stringify(data.columns));
    localStorage.setItem(`kanbanBoard:${data.boardId}:tasks`, JSON.stringify(data.tasks));
    localStorage.setItem(`kanbanBoard:${data.boardId}:labels`, JSON.stringify(data.labels));
    localStorage.setItem(`kanbanBoard:${data.boardId}:settings`, JSON.stringify(data.settings));
  }, fixture);
}
