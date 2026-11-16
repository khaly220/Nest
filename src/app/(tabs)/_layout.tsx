import { Tabs, TabList, TabSlot, TabTrigger } from 'expo-router/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdminTabButton, adminTabs, useTabBarStyles } from '@/components/navigation/TabBar';
import { makeStyles, spacing } from '@/theme';

/**
 * Administrator experience: five destinations kept alive in a headless tab
 * navigator so each tab remembers its scroll position and filters.
 */
export default function AdministratorLayout() {
  const styles = useStyles();
  const tabStyles = useTabBarStyles();
  const insets = useSafeAreaInsets();

  return (
    <Tabs style={styles.root}>
      <TabSlot />
      <TabList style={[tabStyles.bar, { paddingBottom: Math.max(insets.bottom, spacing.xs) }]}>
        {adminTabs.map((tab) => (
          <TabTrigger asChild href={tab.href} key={tab.name} name={tab.name}>
            <AdminTabButton icon={tab.icon} label={tab.label} />
          </TabTrigger>
        ))}
      </TabList>
    </Tabs>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.background },
}));
