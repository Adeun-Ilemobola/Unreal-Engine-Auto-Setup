'use strict';
const sidebarApi = require('./sidebar');

function buildIcon(last) {
  if (last?.status === 'Running') return '$(sync~spin)';
  if (last?.success === false) return '$(error)';
  return last?.success ? '$(check)' : '$(tools)';
}

/**
 * Create native controls once; the extension context owns their disposal.
 * @param {Object} vscode
 * @param {Object} context
 * @param {import('./contracts').Services} services
 * @param {ReturnType<typeof import('./runtimeCoordinator').create>} coordinator
 * @param {function(string):void} report
 * @returns {function(import('./contracts').RuntimeSnapshot):void}
 */
function create(vscode, context, services, coordinator, report) {
  const buttons = [
    ['unrealSetup.build', '$(tools) Build'],
    ['unrealSetup.run', '$(play) Run']
  ].map(([command, text], index) => {
    const button = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 20 - index);
    Object.assign(button, { command, text });
    context.subscriptions.push(button);
    return button;
  });
  const sidebar = sidebarApi.create(vscode, context);
  return snapshot => {
    snapshot.automation = coordinator.snapshot();
    if(snapshot.recovery?.state==='Unknown' && !coordinator.busy) {
      snapshot.automation.state='Recovery blocked';snapshot.automation.blocked=snapshot.recovery.reason;
    }
    snapshot.session && (snapshot.session.automation = snapshot.automation);
    snapshot.dependencies = services.dependencies?.snapshot(snapshot.module);
    sidebar.update(snapshot);
    void services.dependencies?.sync(snapshot).catch(error => report('Dependency state: ' + error.message));
    if (!snapshot.project) {
      buttons.forEach(button => button.hide());
      return;
    }
    const { selected, session, editor } = snapshot,
      last = session.lastBuild;
    buttons[0].text = buildIcon(last) + ' Build';
    buttons[1].text = (editor.state === 'Running' ? '$(check)' : '$(play)') + ' Run';
    buttons[0].tooltip =
      'Build ' +
      (selected.target || '(select target)') +
      ' | ' +
      selected.platform +
      ' | ' +
      selected.configuration +
      (last ? '\nLast build: ' + last.status : '') +
      '\nPending: ' +
      snapshot.automation.dirty.length +
      ' files | ' +
      snapshot.automation.state +
      (snapshot.automation.blocked ? ' | ' + snapshot.automation.blocked : '');
    buttons[1].tooltip =
      'Build an Editor target and open it for testing. Pending changes are compiled before opening; close a running Editor before an external rebuild.\nEditor: ' +
      editor.state;
    buttons.forEach(button => button.show());
  };
}
module.exports = { create };
