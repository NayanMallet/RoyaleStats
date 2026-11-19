import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import jwt from 'jsonwebtoken';

process.env.USER_DB_FILE = ':memory:';
process.env.JWT_SECRET = 'test-secret';
process.env.LOG_LEVEL = 'fatal';

const { initDatabase, getDatabase } = await import('./database');
const { createApp } = await import('./app');

let server: Server;
let baseUrl: string;

async function call(
  method: string,
  path: string,
  options: { token?: string; body?: unknown; rawBody?: string } = {},
) {
  const response = await fetch(`${baseUrl}/users${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body:
      options.rawBody ?? (options.body === undefined ? undefined : JSON.stringify(options.body)),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : undefined };
}

const karim = { name: 'Karim', email: 'karim@example.com', password: 'secret123' };

async function registerAndLogin(user = karim) {
  await call('POST', '/register', { body: user });
  const { body } = await call('POST', '/login', {
    body: { email: user.email, password: user.password },
  });
  return body as { token: string; user: { id: number } };
}

beforeAll(async () => {
  initDatabase();
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server?.close();
});

beforeEach(() => {
  getDatabase().exec('DELETE FROM users');
});

describe('POST /users/register', () => {
  it('creates the account and never returns the password', async () => {
    const { status, body } = await call('POST', '/register', { body: karim });

    expect(status).toBe(201);
    expect(body).toMatchObject({ name: 'Karim', email: 'karim@example.com' });
    expect(body).not.toHaveProperty('password');
  });

  it('stores a bcrypt hash, not the password', async () => {
    await call('POST', '/register', { body: karim });

    const { password } = getDatabase()
      .prepare('SELECT password FROM users WHERE email = ?')
      .get(karim.email) as { password: string };
    expect(password).not.toBe(karim.password);
    expect(password).toMatch(/^\$2[aby]\$10\$/);
  });

  it('answers 409 for an email already used', async () => {
    await call('POST', '/register', { body: karim });

    const { status, body } = await call('POST', '/register', { body: karim });

    expect(status).toBe(409);
    expect(body).toMatchObject({
      error: 'ConflictError',
      message: 'Un compte existe déjà avec cet email.',
    });
  });

  it.each([
    ['without password', { name: 'Karim', email: 'karim@example.com' }],
    ['without email', { name: 'Karim', password: 'secret123' }],
    ['without name', { email: 'karim@example.com', password: 'secret123' }],
  ])('answers 400 %s', async (_label, body) => {
    expect((await call('POST', '/register', { body })).status).toBe(400);
  });

  it('answers 400 for a body that is not JSON', async () => {
    const { status, body } = await call('POST', '/register', { rawBody: '{oops' });

    expect(status).toBe(400);
    expect(body.error).toBe('ValidationError');
  });
});

describe('POST /users/login', () => {
  it('returns a JWT for the account and the user without password', async () => {
    await call('POST', '/register', { body: karim });

    const { status, body } = await call('POST', '/login', {
      body: { email: karim.email, password: karim.password },
    });

    expect(status).toBe(200);
    expect(body.user).not.toHaveProperty('password');
    const payload = jwt.verify(body.token, 'test-secret') as { userId: number; email: string };
    expect(payload).toMatchObject({ userId: body.user.id, email: karim.email });
  });

  it('gives the same 401 for a wrong password and an unknown email', async () => {
    await call('POST', '/register', { body: karim });

    const wrongPassword = await call('POST', '/login', {
      body: { email: karim.email, password: 'nope' },
    });
    const unknownEmail = await call('POST', '/login', {
      body: { email: 'nobody@example.com', password: 'nope' },
    });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
  });
});

describe('GET /users/me', () => {
  it('returns the account of the token', async () => {
    const { token, user } = await registerAndLogin();

    const { status, body } = await call('GET', '/me', { token });

    expect(status).toBe(200);
    expect(body).toMatchObject({ id: user.id, email: karim.email });
    expect(body).not.toHaveProperty('password');
  });

  it.each([
    ['no token', undefined],
    ['a malformed token', 'not-a-jwt'],
    ['a token signed with another secret', jwt.sign({ userId: 1, email: 'a@b.c' }, 'other-secret')],
    [
      'an expired token',
      jwt.sign({ userId: 1, email: 'a@b.c' }, 'test-secret', { expiresIn: -10 }),
    ],
  ])('answers 401 with %s', async (_label, token) => {
    const { status, body } = await call('GET', '/me', { token });

    expect(status).toBe(401);
    expect(body.error).toBe('AuthenticationError');
  });

  it('answers 404 when the account of a valid token was deleted', async () => {
    const { token } = await registerAndLogin();
    await call('DELETE', '/me', { token });

    const { status, body } = await call('GET', '/me', { token });

    expect(status).toBe(404);
    expect(body.error).toBe('UserNotFound');
  });
});

describe('PUT /users/me', () => {
  it('updates the name of the account of the token', async () => {
    const { token } = await registerAndLogin();

    const { status, body } = await call('PUT', '/me', { token, body: { name: 'Karim B.' } });

    expect(status).toBe(200);
    expect(body.name).toBe('Karim B.');
  });

  it('answers 409 when the new email belongs to another account', async () => {
    await registerAndLogin({ name: 'Sacha', email: 'sacha@example.com', password: 'secret123' });
    const { token } = await registerAndLogin();

    const { status, body } = await call('PUT', '/me', {
      token,
      body: { email: 'sacha@example.com' },
    });

    expect(status).toBe(409);
    expect(body.error).toBe('ConflictError');
  });

  it('answers 400 without any field to update', async () => {
    const { token } = await registerAndLogin();

    expect((await call('PUT', '/me', { token, body: {} })).status).toBe(400);
  });

  it('answers 401 without token', async () => {
    expect((await call('PUT', '/me', { body: { name: 'x' } })).status).toBe(401);
  });
});

describe('input rules (RST-29)', () => {
  it.each([
    ['an email without @', { email: 'karim' }, 'email', 'L’email n’est pas valide.'],
    ['an email with spaces', { email: 'karim @example.com' }, 'email', 'L’email n’est pas valide.'],
    [
      'a password shorter than 8 characters',
      { password: '1234567' },
      'password',
      'Le mot de passe doit contenir au moins 8 caractères.',
    ],
    [
      'a password longer than bcrypt can hash',
      { password: 'é'.repeat(40) },
      'password',
      'Le mot de passe est trop long.',
    ],
    [
      'a name longer than 50 characters',
      { name: 'x'.repeat(51) },
      'name',
      'Le nom ne doit pas dépasser 50 caractères.',
    ],
    ['a blank name', { name: '   ' }, 'name', 'Le nom est obligatoire.'],
  ])('refuses %s with the field in details', async (_label, override, field, message) => {
    const { status, body } = await call('POST', '/register', { body: { ...karim, ...override } });

    expect(status).toBe(400);
    expect(body.details).toEqual({ [field]: message });
    expect(body.message).toBe(message);
  });

  it('reports every invalid field at once', async () => {
    const { body } = await call('POST', '/register', {
      body: { name: '', email: 'nope', password: '1' },
    });

    expect(Object.keys(body.details).sort()).toEqual(['email', 'name', 'password']);
    expect(body.message).toBe('Certains champs sont invalides.');
  });

  it('stores the email trimmed and lower-cased, and logs in whatever the case', async () => {
    const { body } = await call('POST', '/register', {
      body: { ...karim, email: '  Karim@Example.COM ' },
    });
    expect(body.email).toBe('karim@example.com');

    const login = await call('POST', '/login', {
      body: { email: 'KARIM@example.com', password: karim.password },
    });
    expect(login.status).toBe(200);
  });

  it('treats an email differing only by case as already used', async () => {
    await call('POST', '/register', { body: karim });

    const { status } = await call('POST', '/register', {
      body: { ...karim, email: 'KARIM@EXAMPLE.COM' },
    });

    expect(status).toBe(409);
  });

  it('still logs in an account created with a mixed-case email before these rules', async () => {
    await call('POST', '/register', { body: karim });
    getDatabase()
      .prepare('UPDATE users SET email = ? WHERE email = ?')
      .run('Karim@Example.com', karim.email);

    const { status } = await call('POST', '/login', {
      body: { email: 'karim@example.com', password: karim.password },
    });

    expect(status).toBe(200);
  });

  it('answers 409 with a business message when the new email is taken', async () => {
    await registerAndLogin({ name: 'Sacha', email: 'sacha@example.com', password: 'secret123' });
    const { token } = await registerAndLogin();

    const { status, body } = await call('PUT', '/me', {
      token,
      body: { email: 'Sacha@Example.com' },
    });

    expect(status).toBe(409);
    expect(body.message).toBe('Un compte existe déjà avec cet email.');
  });

  it('lets a user save their profile with their own email unchanged', async () => {
    const { token } = await registerAndLogin();

    const { status } = await call('PUT', '/me', {
      token,
      body: { name: 'Karim B.', email: 'KARIM@example.com' },
    });

    expect(status).toBe(200);
  });

  it('no longer lists the accounts', async () => {
    await call('POST', '/register', { body: karim });

    const { status, body } = await call('GET', '');

    expect(status).toBe(404);
    expect(JSON.stringify(body)).not.toContain('karim@example.com');
  });
});
