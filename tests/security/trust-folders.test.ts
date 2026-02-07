import * as path from 'path';
import * as os from 'os';
import { TrustFolderManager } from '../../src/security/trust-folders.js';

describe('TrustFolderManager', () => {
  let manager: TrustFolderManager;

  beforeEach(() => {
    manager = new TrustFolderManager();
    manager.setEnforcement(true);
  });

  it('should trust current working directory by default', () => {
    const cwd = process.cwd();
    expect(manager.isTrusted(cwd)).toBe(true);
    expect(manager.isTrusted(path.join(cwd, 'src', 'file.ts'))).toBe(true);
  });

  it('should not trust arbitrary directories', () => {
    expect(manager.isTrusted('/some/random/dir')).toBe(false);
  });

  it('should trust explicitly added folders', () => {
    const testDir = '/tmp/test-trusted';
    expect(manager.trustFolder(testDir)).toBe(true);
    expect(manager.isTrusted(testDir)).toBe(true);
    expect(manager.isTrusted(path.join(testDir, 'sub', 'file.txt'))).toBe(true);
  });

  it('should block always-blocked directories', () => {
    expect(manager.isBlocked('/')).toBe(true);
    expect(manager.isBlocked('/etc')).toBe(true);
    expect(manager.isBlocked(os.homedir())).toBe(true);
    expect(manager.isBlocked(path.join(os.homedir(), '.ssh'))).toBe(true);
  });

  it('should refuse to trust blocked directories', () => {
    expect(manager.trustFolder('/')).toBe(false);
    expect(manager.trustFolder(os.homedir())).toBe(false);
  });

  it('should untrust folders', () => {
    const testDir = '/tmp/test-untrust';
    manager.trustFolder(testDir);
    expect(manager.isTrusted(testDir)).toBe(true);

    expect(manager.untrustFolder(testDir)).toBe(true);
    expect(manager.isTrusted(testDir)).toBe(false);
  });

  it('should return false when untrusting non-existent folder', () => {
    expect(manager.untrustFolder('/never/added')).toBe(false);
  });

  it('should allow everything when enforcement is disabled', () => {
    manager.setEnforcement(false);
    expect(manager.isTrusted('/any/path')).toBe(true);
    expect(manager.isEnforcementEnabled()).toBe(false);
  });

  it('should list trusted folders', () => {
    manager.trustFolder('/tmp/a');
    manager.trustFolder('/tmp/b');
    const folders = manager.getTrustedFolders();
    expect(folders).toContain(path.resolve('/tmp/a'));
    expect(folders).toContain(path.resolve('/tmp/b'));
  });
});
