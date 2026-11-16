const { withAndroidManifest } = require('expo/config-plugins');

const MAIN_ACTION = 'android.intent.action.MAIN';
const LAUNCHER_CATEGORY = 'android.intent.category.LAUNCHER';

module.exports = function withAppDiscovery(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const queries = manifest.queries ?? (manifest.queries = [{}]);
    const query = queries[0];
    const intents = query.intent ?? (query.intent = []);
    const alreadyDeclared = intents.some(
      (intent) =>
        intent.action?.some((action) => action.$['android:name'] === MAIN_ACTION) &&
        intent.category?.some((category) => category.$['android:name'] === LAUNCHER_CATEGORY),
    );

    if (!alreadyDeclared) {
      intents.push({
        action: [{ $: { 'android:name': MAIN_ACTION } }],
        category: [{ $: { 'android:name': LAUNCHER_CATEGORY } }],
      });
    }

    return config;
  });
};
