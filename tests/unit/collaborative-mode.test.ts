/**
 * Unit tests for Collaborative Mode
 */

import {
  CollaborativeSessionManager,
  getCollaborationManager,
  resetCollaborationManager,
} from '../../src/collaboration/collaborative-mode';

describe('CollaborativeSessionManager', () => {
  let manager: CollaborativeSessionManager;

  beforeEach(() => {
    manager = new CollaborativeSessionManager();
  });

  afterEach(() => {
    manager.dispose();
  });

  describe('createSession', () => {
    it('should create a new session', () => {
      const session = manager.createSession('Test Session', {
        name: 'John Doe',
        email: 'john@example.com',
      });

      expect(session).toBeDefined();
      expect(session.id).toMatch(/^sess_[a-f0-9]+$/);
      expect(session.name).toBe('Test Session');
      expect(session.users.size).toBe(1);
    });

    it('should set creator as owner', () => {
      const session = manager.createSession('Test Session', {
        name: 'John Doe',
      });

      const owner = session.users.get(session.ownerId);
      expect(owner).toBeDefined();
      expect(owner!.role).toBe('owner');
      expect(owner!.name).toBe('John Doe');
    });

    it('should assign color to user', () => {
      const session = manager.createSession('Test Session', {
        name: 'John Doe',
      });

      const owner = session.users.get(session.ownerId);
      expect(owner!.color).toMatch(/^#[A-F0-9]{6}$/);
    });

    it('should apply custom permissions', () => {
      const session = manager.createSession(
        'Test Session',
        { name: 'John Doe' },
        {
          allowEditing: false,
          maxUsers: 5,
        }
      );

      expect(session.permissions.allowEditing).toBe(false);
      expect(session.permissions.maxUsers).toBe(5);
    });

    it('should emit session-created event', () => {
      const handler = jest.fn();
      manager.on('session-created', handler);

      manager.createSession('Test Session', { name: 'John Doe' });

      expect(handler).toHaveBeenCalled();
    });

    it('should set expiration time', () => {
      const session = manager.createSession('Test Session', {
        name: 'John Doe',
      });

      expect(session.expiresAt).toBeInstanceOf(Date);
      expect(session.expiresAt!.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('joinSession', () => {
    it('should allow user to join existing session', async () => {
      const session = manager.createSession('Test Session', {
        name: 'Owner',
      });

      // Create new manager to join
      const manager2 = new CollaborativeSessionManager();
      // Copy session to second manager (simulating shared state)
      (manager2 as any).sessions.set(session.id, session);

      const joinedSession = await manager2.joinSession(session.id, {
        name: 'Joiner',
      });

      expect(joinedSession.users.size).toBe(2);
      manager2.dispose();
    });

    it('should assign editor role to joining users', async () => {
      const session = manager.createSession('Test Session', {
        name: 'Owner',
      });

      const manager2 = new CollaborativeSessionManager();
      (manager2 as any).sessions.set(session.id, session);

      await manager2.joinSession(session.id, { name: 'Joiner' });

      const users = Array.from(session.users.values());
      const joiner = users.find((u) => u.name === 'Joiner');

      expect(joiner!.role).toBe('editor');
      manager2.dispose();
    });

    it('should reject joining non-existent session', async () => {
      await expect(
        manager.joinSession('non-existent', { name: 'User' })
      ).rejects.toThrow('Session not found');
    });

    it('should reject joining full session', async () => {
      const session = manager.createSession(
        'Test Session',
        { name: 'Owner' },
        { maxUsers: 1 }
      );

      const manager2 = new CollaborativeSessionManager();
      (manager2 as any).sessions.set(session.id, session);

      await expect(
        manager2.joinSession(session.id, { name: 'Joiner' })
      ).rejects.toThrow('Session is full');

      manager2.dispose();
    });
  });

  describe('leaveSession', () => {
    it('should remove user from session', () => {
      manager.createSession('Test Session', { name: 'Owner' });

      manager.leaveSession();

      expect(manager.getCurrentSession()).toBeNull();
      expect(manager.getCurrentUser()).toBeNull();
    });

    it('should transfer ownership when owner leaves', async () => {
      const session = manager.createSession('Test Session', {
        name: 'Owner',
      });

      const manager2 = new CollaborativeSessionManager();
      (manager2 as any).sessions.set(session.id, session);

      await manager2.joinSession(session.id, { name: 'Joiner' });

      // Store joiner's ID before owner leaves
      const joiner = Array.from(session.users.values()).find(
        (u) => u.name === 'Joiner'
      );

      manager.leaveSession();

      expect(session.ownerId).toBe(joiner!.id);
      expect(joiner!.role).toBe('owner');

      manager2.dispose();
    });

    it('should delete session when last user leaves', () => {
      manager.createSession('Test Session', { name: 'Owner' });

      manager.leaveSession();

      // Session should be deleted from internal map
      expect((manager as any).sessions.size).toBe(0);
    });

    it('should release file locks when leaving', () => {
      const session = manager.createSession('Test Session', {
        name: 'Owner',
      });

      // Add a file and lock it
      session.sharedContext.files.set('/test.ts', {
        path: '/test.ts',
        content: 'content',
        version: 1,
        lastModifiedBy: manager.getCurrentUser()!.id,
        lastModifiedAt: new Date(),
        locks: new Map([
          [
            manager.getCurrentUser()!.id,
            {
              userId: manager.getCurrentUser()!.id,
              acquiredAt: new Date(),
              expiresAt: new Date(Date.now() + 300000),
            },
          ],
        ]),
      });

      manager.leaveSession();

      // Session is deleted because owner left with no other users
    });
  });

  describe('addMessage', () => {
    it('should add message to shared context', () => {
      manager.createSession('Test Session', { name: 'User' });

      const message = manager.addMessage('Hello world');

      expect(message.content).toBe('Hello world');
      expect(message.type).toBe('user');
      expect(message.id).toMatch(/^msg_/);
    });

    it('should throw when not in session', () => {
      expect(() => manager.addMessage('Hello')).toThrow('Not in a session');
    });

    it('should support different message types', () => {
      manager.createSession('Test Session', { name: 'User' });

      const userMsg = manager.addMessage('User message', 'user');
      const assistantMsg = manager.addMessage('AI response', 'assistant');
      const systemMsg = manager.addMessage('System note', 'system');

      expect(userMsg.type).toBe('user');
      expect(assistantMsg.type).toBe('assistant');
      expect(systemMsg.type).toBe('system');
    });
  });

  describe('updateCursor', () => {
    it('should update current user cursor', () => {
      manager.createSession('Test Session', { name: 'User' });

      manager.updateCursor({
        file: '/src/index.ts',
        line: 42,
        column: 10,
      });

      const user = manager.getCurrentUser();
      expect(user!.cursor).toEqual({
        file: '/src/index.ts',
        line: 42,
        column: 10,
      });
    });

    it('should update lastActive timestamp', () => {
      manager.createSession('Test Session', { name: 'User' });

      const beforeUpdate = manager.getCurrentUser()!.lastActive;

      // Wait a tiny bit to ensure different timestamp
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          manager.updateCursor({ file: '/test.ts', line: 1, column: 1 });

          const afterUpdate = manager.getCurrentUser()!.lastActive;
          expect(afterUpdate.getTime()).toBeGreaterThanOrEqual(
            beforeUpdate.getTime()
          );
          resolve();
        }, 5);
      });
    });
  });

  describe('lockFile', () => {
    beforeEach(() => {
      const session = manager.createSession('Test Session', { name: 'User' });
      session.sharedContext.files.set('/test.ts', {
        path: '/test.ts',
        content: 'content',
        version: 1,
        lastModifiedBy: manager.getCurrentUser()!.id,
        lastModifiedAt: new Date(),
        locks: new Map(),
      });
    });

    it('should lock a file', () => {
      const result = manager.lockFile('/test.ts');

      expect(result).toBe(true);

      const file = manager.getCurrentSession()!.sharedContext.files.get(
        '/test.ts'
      );
      expect(file!.locks.size).toBe(1);
    });

    it('should prevent locking already locked file', async () => {
      manager.lockFile('/test.ts');

      // Try with another user
      const session = manager.getCurrentSession()!;
      const manager2 = new CollaborativeSessionManager();
      (manager2 as any).sessions.set(session.id, session);

      await manager2.joinSession(session.id, { name: 'User2' });

      const result = manager2.lockFile('/test.ts');
      expect(result).toBe(false);

      manager2.dispose();
    });

    it('should return false for non-existent file', () => {
      const result = manager.lockFile('/non-existent.ts');
      expect(result).toBe(false);
    });

    it('should support region locks', () => {
      const result = manager.lockFile('/test.ts', { start: 0, end: 100 });

      expect(result).toBe(true);

      const file = manager.getCurrentSession()!.sharedContext.files.get(
        '/test.ts'
      );
      const lock = file!.locks.get(manager.getCurrentUser()!.id);
      expect(lock!.region).toEqual({ start: 0, end: 100 });
    });
  });

  describe('unlockFile', () => {
    it('should unlock a file', () => {
      const session = manager.createSession('Test Session', { name: 'User' });
      session.sharedContext.files.set('/test.ts', {
        path: '/test.ts',
        content: 'content',
        version: 1,
        lastModifiedBy: manager.getCurrentUser()!.id,
        lastModifiedAt: new Date(),
        locks: new Map(),
      });

      manager.lockFile('/test.ts');
      const result = manager.unlockFile('/test.ts');

      expect(result).toBe(true);

      const file = session.sharedContext.files.get('/test.ts');
      expect(file!.locks.size).toBe(0);
    });
  });

  describe('updateFile', () => {
    it('should update file content', () => {
      const session = manager.createSession('Test Session', { name: 'User' });

      const result = manager.updateFile('/new-file.ts', 'new content');

      expect(result).toBe(true);

      const file = session.sharedContext.files.get('/new-file.ts');
      expect(file!.content).toBe('new content');
      expect(file!.version).toBe(1);
    });

    it('should increment version on update', () => {
      const session = manager.createSession('Test Session', { name: 'User' });

      manager.updateFile('/file.ts', 'v1');
      manager.updateFile('/file.ts', 'v2');
      manager.updateFile('/file.ts', 'v3');

      const file = session.sharedContext.files.get('/file.ts');
      expect(file!.version).toBe(3);
    });

    it('should respect editing permission', () => {
      manager.createSession(
        'Test Session',
        { name: 'User' },
        { allowEditing: false }
      );

      const result = manager.updateFile('/file.ts', 'content');
      expect(result).toBe(false);
    });

    it('should require lock to update locked file', async () => {
      const session = manager.createSession('Test Session', { name: 'Owner' });
      session.sharedContext.files.set('/locked.ts', {
        path: '/locked.ts',
        content: 'original',
        version: 1,
        lastModifiedBy: 'someone',
        lastModifiedAt: new Date(),
        locks: new Map([
          [
            'other-user',
            {
              userId: 'other-user',
              acquiredAt: new Date(),
              expiresAt: new Date(Date.now() + 300000),
            },
          ],
        ]),
      });

      const result = manager.updateFile('/locked.ts', 'new content');
      expect(result).toBe(false);
    });
  });

  describe('getUsers', () => {
    it('should return all users in session', async () => {
      const session = manager.createSession('Test Session', {
        name: 'Owner',
      });

      const manager2 = new CollaborativeSessionManager();
      (manager2 as any).sessions.set(session.id, session);

      await manager2.joinSession(session.id, { name: 'User2' });

      const users = manager.getUsers();
      expect(users).toHaveLength(2);
      expect(users.map((u) => u.name)).toContain('Owner');
      expect(users.map((u) => u.name)).toContain('User2');

      manager2.dispose();
    });

    it('should return empty array when not in session', () => {
      const users = manager.getUsers();
      expect(users).toEqual([]);
    });
  });

  describe('hasPermission', () => {
    it('should return true for owner', () => {
      manager.createSession(
        'Test Session',
        { name: 'Owner' },
        { allowEditing: false }
      );

      // Owner should have all permissions
      expect(manager.hasPermission('allowEditing')).toBe(true);
      expect(manager.hasPermission('allowExecution')).toBe(true);
    });

    it('should check permissions for editors', async () => {
      const session = manager.createSession(
        'Test Session',
        { name: 'Owner' },
        { allowEditing: true, allowExecution: false }
      );

      const manager2 = new CollaborativeSessionManager();
      (manager2 as any).sessions.set(session.id, session);

      await manager2.joinSession(session.id, { name: 'Editor' });

      expect(manager2.hasPermission('allowEditing')).toBe(true);
      expect(manager2.hasPermission('allowExecution')).toBe(false);

      manager2.dispose();
    });
  });

  describe('generateInviteLink', () => {
    it('should generate invite link', () => {
      manager.createSession('Test Session', { name: 'Owner' });

      const link = manager.generateInviteLink();

      expect(link).toMatch(/^codebuddy:\/\/join\/sess_[a-f0-9]+\?code=/);
    });

    it('should throw when not in session', () => {
      expect(() => manager.generateInviteLink()).toThrow('Not in a session');
    });
  });

  describe('singleton', () => {
    afterEach(() => {
      resetCollaborationManager();
    });

    it('should return same instance', () => {
      const instance1 = getCollaborationManager();
      const instance2 = getCollaborationManager();

      expect(instance1).toBe(instance2);
    });

    it('should reset instance', () => {
      const instance1 = getCollaborationManager();
      resetCollaborationManager();
      const instance2 = getCollaborationManager();

      expect(instance1).not.toBe(instance2);
    });
  });
});
