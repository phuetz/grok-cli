/**
 * Unit tests for Conversation Branching
 */

import {
  ConversationBranchManager,
  getConversationBranchManager,
} from '../../src/advanced/conversation-branching';

describe('ConversationBranchManager', () => {
  let manager: ConversationBranchManager;

  beforeEach(() => {
    manager = new ConversationBranchManager();
  });

  describe('constructor', () => {
    it('should create main branch on initialization', () => {
      const branches = manager.getBranches();

      expect(branches).toHaveLength(1);
      expect(branches[0].name).toBe('main');
      expect(branches[0].parentBranchId).toBeNull();
    });

    it('should set main branch as current', () => {
      const current = manager.getCurrentBranch();

      expect(current.name).toBe('main');
    });
  });

  describe('createBranch', () => {
    it('should create a new branch', () => {
      const branch = manager.createBranch('feature', null, null);

      expect(branch).toBeDefined();
      expect(branch.id).toMatch(/^[a-f0-9]+$/);
      expect(branch.name).toBe('feature');
      expect(branch.messages).toEqual([]);
    });

    it('should copy messages from parent up to branch point', () => {
      const main = manager.getCurrentBranch();

      // Add messages to main
      const msg1 = manager.addMessage('user', 'message 1');
      const msg2 = manager.addMessage('assistant', 'message 2');
      const msg3 = manager.addMessage('user', 'message 3');

      // Branch from msg2
      const branch = manager.createBranch('feature', main.id, msg2.id);

      expect(branch.messages).toHaveLength(2);
      expect(branch.messages[0].content).toBe('message 1');
      expect(branch.messages[1].content).toBe('message 2');
    });

    it('should emit branch-created event', () => {
      const handler = jest.fn();
      manager.on('branch-created', handler);

      manager.createBranch('feature', null, null);

      // Called twice: once for main in constructor, once for feature
      expect(handler).toHaveBeenCalled();
    });

    it('should set parent and branch point', () => {
      const main = manager.getCurrentBranch();
      const msg = manager.addMessage('user', 'test');

      const branch = manager.createBranch('feature', main.id, msg.id);

      expect(branch.parentBranchId).toBe(main.id);
      expect(branch.branchPointMessageId).toBe(msg.id);
    });
  });

  describe('switchBranch', () => {
    it('should switch to existing branch', () => {
      const branch = manager.createBranch('feature', null, null);

      const result = manager.switchBranch(branch.id);

      expect(result).toBe(branch);
      expect(manager.getCurrentBranch().id).toBe(branch.id);
    });

    it('should return null for non-existent branch', () => {
      const result = manager.switchBranch('non-existent');

      expect(result).toBeNull();
    });

    it('should emit branch-switched event', () => {
      const handler = jest.fn();
      manager.on('branch-switched', handler);

      const branch = manager.createBranch('feature', null, null);
      manager.switchBranch(branch.id);

      expect(handler).toHaveBeenCalledWith(branch);
    });
  });

  describe('addMessage', () => {
    it('should add message to current branch', () => {
      const message = manager.addMessage('user', 'Hello');

      expect(message).toBeDefined();
      expect(message.role).toBe('user');
      expect(message.content).toBe('Hello');
      expect(message.id).toMatch(/^[a-f0-9]+$/);

      const branch = manager.getCurrentBranch();
      expect(branch.messages).toContain(message);
    });

    it('should support different roles', () => {
      const userMsg = manager.addMessage('user', 'question');
      const assistantMsg = manager.addMessage('assistant', 'answer');
      const systemMsg = manager.addMessage('system', 'note');

      expect(userMsg.role).toBe('user');
      expect(assistantMsg.role).toBe('assistant');
      expect(systemMsg.role).toBe('system');
    });

    it('should emit message-added event', () => {
      const handler = jest.fn();
      manager.on('message-added', handler);

      manager.addMessage('user', 'test');

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.objectContaining({ content: 'test' }),
        })
      );
    });

    it('should add messages to correct branch', () => {
      manager.addMessage('user', 'main message');

      const branch = manager.createBranch('feature', null, null);
      manager.switchBranch(branch.id);
      manager.addMessage('user', 'feature message');

      const main = manager.getBranches().find((b) => b.name === 'main');
      expect(main!.messages).toHaveLength(1);
      expect(main!.messages[0].content).toBe('main message');

      expect(branch.messages).toHaveLength(1);
      expect(branch.messages[0].content).toBe('feature message');
    });
  });

  describe('branchFromMessage', () => {
    it('should create branch from specific message', () => {
      const msg1 = manager.addMessage('user', 'msg1');
      const msg2 = manager.addMessage('assistant', 'msg2');

      const branch = manager.branchFromMessage(msg1.id, 'new-branch');

      expect(branch.name).toBe('new-branch');
      expect(branch.branchPointMessageId).toBe(msg1.id);
      expect(branch.messages).toHaveLength(1);
    });
  });

  describe('mergeBranches', () => {
    it('should merge source into target', () => {
      const main = manager.getCurrentBranch();
      manager.addMessage('user', 'main msg 1');

      const feature = manager.createBranch('feature', null, null);
      manager.switchBranch(feature.id);
      manager.addMessage('user', 'feature msg 1');
      manager.addMessage('assistant', 'feature msg 2');

      const result = manager.mergeBranches(feature.id, main.id);

      expect(result.success).toBe(true);
      expect(result.mergedBranch.messages).toHaveLength(3);
    });

    it('should throw for non-existent branches', () => {
      expect(() =>
        manager.mergeBranches('non-existent', manager.getCurrentBranch().id)
      ).toThrow('Branch not found');
    });

    it('should record merge metadata', () => {
      const main = manager.getCurrentBranch();
      const feature = manager.createBranch('feature', null, null);

      const result = manager.mergeBranches(feature.id, main.id);

      expect(result.mergedBranch.metadata.mergedFrom).toBe(feature.id);
      expect(result.mergedBranch.metadata.mergedAt).toBeDefined();
    });

    it('should emit branches-merged event', () => {
      const handler = jest.fn();
      manager.on('branches-merged', handler);

      const main = manager.getCurrentBranch();
      const feature = manager.createBranch('feature', null, null);
      manager.mergeBranches(feature.id, main.id);

      expect(handler).toHaveBeenCalledWith({
        sourceBranchId: feature.id,
        targetBranchId: main.id,
      });
    });

    it('should not duplicate messages', () => {
      const main = manager.getCurrentBranch();
      const msg = manager.addMessage('user', 'shared');

      const feature = manager.createBranch('feature', main.id, msg.id);
      manager.switchBranch(feature.id);
      manager.addMessage('user', 'unique');

      const result = manager.mergeBranches(feature.id, main.id);

      const sharedMsgCount = result.mergedBranch.messages.filter(
        (m) => m.content === 'shared'
      ).length;
      expect(sharedMsgCount).toBe(1);
    });

    it('should sort messages by timestamp', () => {
      const main = manager.getCurrentBranch();
      manager.addMessage('user', 'first');

      const feature = manager.createBranch('feature', null, null);
      manager.switchBranch(feature.id);

      // Add later message to feature
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          manager.addMessage('user', 'second');
          manager.switchBranch(main.id);

          const result = manager.mergeBranches(feature.id, main.id);

          // Messages should be sorted by timestamp
          for (let i = 1; i < result.mergedBranch.messages.length; i++) {
            expect(
              result.mergedBranch.messages[i].timestamp.getTime()
            ).toBeGreaterThanOrEqual(
              result.mergedBranch.messages[i - 1].timestamp.getTime()
            );
          }
          resolve();
        }, 5);
      });
    });
  });

  describe('deleteBranch', () => {
    it('should delete a branch', () => {
      const branch = manager.createBranch('to-delete', null, null);
      const initialCount = manager.getBranches().length;

      const deleted = manager.deleteBranch(branch.id);

      expect(deleted).toBe(true);
      expect(manager.getBranches()).toHaveLength(initialCount - 1);
    });

    it('should not delete current branch', () => {
      const currentId = manager.getCurrentBranch().id;

      const deleted = manager.deleteBranch(currentId);

      expect(deleted).toBe(false);
      expect(manager.getBranch(currentId)).toBeDefined();
    });

    it('should return false for non-existent branch', () => {
      const deleted = manager.deleteBranch('non-existent');
      expect(deleted).toBe(false);
    });

    it('should emit branch-deleted event', () => {
      const handler = jest.fn();
      manager.on('branch-deleted', handler);

      const branch = manager.createBranch('to-delete', null, null);
      manager.deleteBranch(branch.id);

      expect(handler).toHaveBeenCalledWith(branch.id);
    });
  });

  describe('getBranches', () => {
    it('should return all branches', () => {
      manager.createBranch('b1', null, null);
      manager.createBranch('b2', null, null);
      manager.createBranch('b3', null, null);

      const branches = manager.getBranches();

      expect(branches).toHaveLength(4); // main + 3 created
    });
  });

  describe('getBranch', () => {
    it('should return specific branch', () => {
      const branch = manager.createBranch('test', null, null);

      const retrieved = manager.getBranch(branch.id);

      expect(retrieved).toBe(branch);
    });

    it('should return undefined for unknown branch', () => {
      const retrieved = manager.getBranch('unknown');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('renameBranch', () => {
    it('should rename a branch', () => {
      const branch = manager.createBranch('old-name', null, null);

      const renamed = manager.renameBranch(branch.id, 'new-name');

      expect(renamed).toBe(true);
      expect(branch.name).toBe('new-name');
    });

    it('should return false for unknown branch', () => {
      const renamed = manager.renameBranch('unknown', 'new-name');
      expect(renamed).toBe(false);
    });

    it('should emit branch-renamed event', () => {
      const handler = jest.fn();
      manager.on('branch-renamed', handler);

      const branch = manager.createBranch('old', null, null);
      manager.renameBranch(branch.id, 'new');

      expect(handler).toHaveBeenCalledWith({
        branchId: branch.id,
        newName: 'new',
      });
    });
  });

  describe('getHistory', () => {
    it('should return branch ancestry', () => {
      const main = manager.getCurrentBranch();
      const msg = manager.addMessage('user', 'test');

      const child = manager.createBranch('child', main.id, msg.id);
      manager.switchBranch(child.id);
      const childMsg = manager.addMessage('user', 'child test');

      const grandchild = manager.createBranch('grandchild', child.id, childMsg.id);

      const history = manager.getHistory(grandchild.id);

      expect(history).toHaveLength(3);
      expect(history[0].name).toBe('main');
      expect(history[1].name).toBe('child');
      expect(history[2].name).toBe('grandchild');
    });

    it('should return single item for orphan branch', () => {
      const orphan = manager.createBranch('orphan', null, null);

      const history = manager.getHistory(orphan.id);

      expect(history).toHaveLength(1);
      expect(history[0]).toBe(orphan);
    });

    it('should return empty for unknown branch', () => {
      const history = manager.getHistory('unknown');
      expect(history).toEqual([]);
    });
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const instance1 = getConversationBranchManager();
      const instance2 = getConversationBranchManager();

      expect(instance1).toBe(instance2);
    });
  });
});
