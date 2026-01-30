export default class HelloWorldPlugin {
  activate(context) {
    context.logger.info('Hello World plugin activated!');

    // Register a slash command
    context.registerCommand({
      name: 'hello',
      description: 'Say hello',
      prompt: 'Say hello to the user in a friendly way.',
      filePath: '',
      isBuiltin: false
    });

    // Register a tool
    context.registerTool({
      name: 'say_hello',
      description: 'Returns a hello message',
      factory: () => ({
        name: 'say_hello',
        description: 'Returns a hello message',
        execute: async ({ name }) => {
          return {
            success: true,
            output: `Hello ${name || 'World'} from the plugin!`
          };
        }
      }),
      defaultPermission: 'always',
      defaultTimeout: 5,
      readOnly: true
    });
  }

  deactivate() {
    console.log('Hello World plugin deactivated');
  }
}
