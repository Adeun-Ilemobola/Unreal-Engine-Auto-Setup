'use strict';
const projects = require('./project');

/** Register UI adapters; workflow execution and process ownership stay in the supplied services. */
function register(vscode, context, { coordinator, builds, refresh }) {
  for (const [command, mode] of [
    ['run', 'run'],
    ['build', 'build'],
    ['buildAndRun', 'buildAndOpen'],
    ['openEditor', 'open'],
    ['regenerate', 'generate']
  ])
    context.subscriptions.push(
      vscode.commands.registerCommand('unrealSetup.' + command, async () => {
        if (coordinator.busy) {
          builds.reveal?.();
          return;
        }
        return coordinator.run(mode);
      })
    );
  context.subscriptions.push(
    vscode.commands.registerCommand('unrealSetup.cancelPendingAutomaticBuild', () =>
      coordinator.cancelPending()
    ),
    vscode.commands.registerCommand('unrealSetup.cancelBuild', () => {
      if(builds.active===false) {
        const reason='No operation is controlled by this host. Recovered processes cannot be safely terminated; inspect recovery details in Build status.';
        vscode.window.showWarningMessage(reason);return {state:'Refused',reason};
      }
      return builds.cancel?.();
    })
  );
  for (const [id, key, values] of [
    ['automationMode', 'automationMode', ['watch', 'off', 'autoBuild', 'autoBuildAndRegenerate']],
    ['autoBuildDelay', 'autoBuildDelay'],
    ['runtimeInterval', 'runtimeRefreshInterval']
  ])
    context.subscriptions.push(
      vscode.commands.registerCommand('unrealSetup.' + id, async () => {
        const choice = values
          ? await vscode.window.showQuickPick(values, { placeHolder: 'Project automation mode' })
          : await vscode.window.showInputBox({
              prompt:
                key === 'autoBuildDelay'
                  ? 'Auto build delay: 5–300 seconds'
                  : 'Reconciliation: 0 or 10–3600 seconds',
              validateInput: text => {
                const n = Number(text);
                return /^\d+$/.test(text) &&
                  (key === 'autoBuildDelay' ? n >= 5 && n <= 300 : n === 0 || (n >= 10 && n <= 3600))
                  ? undefined
                  : 'Enter a supported number of seconds';
              }
            });
        if (choice !== undefined)
          await vscode.workspace
            .getConfiguration()
            .update(
              'unrealSetup.' + key,
              values ? choice : Number(choice),
              vscode.ConfigurationTarget.Workspace
            );
      })
    );
  for (const field of ['target', 'platform', 'configuration']) {
    context.subscriptions.push(
      vscode.commands.registerCommand(
        'unrealSetup.select' + field[0].toUpperCase() + field.slice(1),
        async () => {
          if (!vscode.workspace.isTrusted) return;
          try {
            const project = await projects.readProject(vscode);
            if (project) await projects.select(vscode, context, project, field);
            await refresh();
          } catch (error) {
            vscode.window.showErrorMessage('Unreal: ' + error.message);
          }
        }
      )
    );
  }
  const actions = {
    'New Module': 'newModule',
    'New Plugin': 'newPlugin',
    'Open Plugin Descriptor': 'openPluginDescriptor',
    'New C++ Class': 'newClass',
    'Open Module Build.cs': 'openModuleRules',
    'Open Project Descriptor': 'openProjectDescriptor',
    'Open Target Rules': 'openTargetRules',
    'Target': 'selectTarget',
    'Platform': 'selectPlatform',
    'Configuration': 'selectConfiguration',
    'Open Editor': 'openEditor',
    'Build and Open Editor': 'buildAndRun',
    'Attach Debugger to Editor': 'attachDebugger',
    'Regenerate Project Files': 'regenerate',
    'Diagnose Project': 'diagnose',
    'Open Latest Project Log': 'openLatestLog'
  };
  context.subscriptions.push(
    vscode.commands.registerCommand('unrealSetup.selectBuild', async () => {
      if (!vscode.workspace.isTrusted) return;
      const choice = await vscode.window.showQuickPick(Object.keys(actions), {
        placeHolder: 'Unreal build settings and runtime controls'
      });
      if (choice) await vscode.commands.executeCommand('unrealSetup.' + actions[choice]);
    })
  );
}
module.exports = { register };
