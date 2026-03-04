const API_URL = 'http://localhost:3000/api';

export async function createBoard(name: string) {
  const res = await fetch(`${API_URL}/boards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return res.json();
}

export async function createColumn(boardId: string, name: string, position: number) {
  const res = await fetch(`${API_URL}/boards/${boardId}/columns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, position, boardId }),
  });
  return res.json();
}

export async function createCard(boardId: string, columnId: string, title: string) {
  const res = await fetch(`${API_URL}/boards/${boardId}/cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ boardId, columnId, title }),
  });
  return res.json();
}

export async function createAgent(name: string, role: string) {
  const res = await fetch(`${API_URL}/agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, role }),
  });
  return res.json();
}
