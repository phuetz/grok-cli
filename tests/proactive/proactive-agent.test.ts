import { ProactiveAgent } from '../../src/agent/proactive/proactive-agent.js';

describe('ProactiveAgent', () => {
  let agent: ProactiveAgent;

  beforeEach(() => {
    agent = new ProactiveAgent();
  });

  it('should send message via local fallback', async () => {
    const events: string[] = [];
    agent.on('message:local', () => events.push('local'));

    const result = await agent.sendMessage({
      channelType: 'cli',
      channelId: 'test',
      message: 'Hello',
      priority: 'normal',
    });

    expect(result.delivered).toBe(true);
    expect(events).toContain('local');
  });

  it('should send message via custom implementation', async () => {
    agent.setSendMethod(async (msg) => ({
      delivered: true,
      channelType: msg.channelType,
      channelId: msg.channelId,
      messageId: 'msg-1',
      timestamp: new Date(),
    }));

    const result = await agent.sendMessage({
      channelType: 'telegram',
      channelId: 'chat-123',
      message: 'Test',
      priority: 'high',
    });

    expect(result.delivered).toBe(true);
    expect(result.messageId).toBe('msg-1');
  });

  it('should handle send failure', async () => {
    agent.setSendMethod(async () => {
      throw new Error('Network error');
    });

    const result = await agent.sendMessage({
      channelType: 'telegram',
      channelId: 'chat-123',
      message: 'Test',
      priority: 'normal',
    });

    expect(result.delivered).toBe(false);
    expect(result.error).toContain('Network error');
  });

  it('should ask question with timeout', async () => {
    const result = await agent.askQuestion(
      'Pick one',
      ['A', 'B', 'C'],
      'cli',
      'test-channel',
      100 // 100ms timeout
    );

    expect(result.answered).toBe(false);
    expect(result.timedOut).toBe(true);
  });

  it('should receive response to question', async () => {
    const questionPromise = agent.askQuestion(
      'Pick one',
      ['A', 'B'],
      'cli',
      'test-channel',
      5000
    );

    // Listen for question event and respond
    agent.once('question:asked', ({ questionId }) => {
      setTimeout(() => agent.receiveResponse(questionId, 'A'), 10);
    });

    const result = await questionPromise;
    expect(result.answered).toBe(true);
    expect(result.response).toBe('A');
    expect(result.timedOut).toBe(false);
  });

  it('should track pending questions', async () => {
    expect(agent.getPendingQuestions()).toBe(0);
    // Start a question (don't await the result)
    const promise = agent.askQuestion('Test?', ['Y', 'N'], 'cli', 'ch', 5000);
    // Wait for microtask (sendMessage) to complete
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(agent.getPendingQuestions()).toBe(1);
    // Clean up - respond to avoid timer leak
    agent.once('question:asked', ({ questionId }) => agent.receiveResponse(questionId, 'Y'));
    // Cancel by triggering timeout won't work, just await
    await Promise.race([promise, new Promise(resolve => setTimeout(resolve, 50))]);
  });

  it('should notify completion', async () => {
    const result = await agent.notifyCompletion(
      'task-1',
      { success: true, output: 'Done' },
      'cli',
      'test-channel'
    );
    expect(result.delivered).toBe(true);
  });
});
