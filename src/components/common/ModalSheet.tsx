import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/common/Button';
import { makeStyles, radius, shadows, screenPadding, spacing, typography, useTheme } from '@/theme';

type ModalSheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Sticky footer, usually action buttons. */
  footer?: React.ReactNode;
  scroll?: boolean;
  /** Prevents dismissing by tapping the backdrop. */
  dismissable?: boolean;
};

/** Bottom sheet style modal used for detail, confirmation and preview flows. */
export function ModalSheet({ visible, onClose, title, subtitle, children, footer, scroll = true, dismissable = true }: ModalSheetProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const body = scroll ? (
    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={styles.staticContent}>{children}</View>
  );

  return (
    <Modal animationType="slide" onRequestClose={onClose} statusBarTranslucent transparent visible={visible}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="Close" disabled={!dismissable} onPress={onClose} style={StyleSheet.absoluteFill} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <Pressable accessibilityLabel="Close" accessibilityRole="button" hitSlop={10} onPress={onClose} style={styles.close}>
              <Ionicons color={colors.inkSecondary} name="close" size={20} />
            </Pressable>
          </View>
          {body}
          {footer ? <SafeAreaView edges={['bottom']} style={styles.footer}>{footer}</SafeAreaView> : null}
        </View>
      </View>
    </Modal>
  );
}

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
};

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  icon = 'help-circle-outline',
  loading = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <Modal animationType="fade" onRequestClose={onCancel} statusBarTranslucent transparent visible={visible}>
      <View style={styles.dialogBackdrop}>
        <Pressable accessibilityLabel={cancelLabel} onPress={onCancel} style={StyleSheet.absoluteFill} />
        <View style={styles.dialog}>
          <View style={[styles.dialogIcon, tone === 'danger' && styles.dialogIconDanger]}>
            <Ionicons color={tone === 'danger' ? colors.danger : colors.brandInk} name={icon} size={24} />
          </View>
          <Text style={styles.dialogTitle}>{title}</Text>
          <Text style={styles.dialogMessage}>{message}</Text>
          {children}
          <View style={styles.dialogActions}>
            <Button label={cancelLabel} onPress={onCancel} style={styles.dialogButton} variant="secondary" />
            <Button label={confirmLabel} loading={loading} onPress={onConfirm} style={styles.dialogButton} variant={tone === 'danger' ? 'danger' : 'primary'} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((t) => ({
  backdrop: { flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: t.colors.background,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    maxHeight: '92%',
    paddingTop: spacing.xs,
    ...shadows.float,
  },
  handle: { alignSelf: 'center', width: 44, height: 4, borderRadius: 2, backgroundColor: t.colors.borderStrong, marginBottom: spacing.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: screenPadding,
    paddingBottom: spacing.sm,
  },
  headerCopy: { flex: 1, gap: 2 },
  title: { ...typography.title2, color: t.colors.ink },
  subtitle: { ...typography.micro, color: t.colors.inkSecondary, lineHeight: 17 },
  close: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: { paddingHorizontal: screenPadding, paddingBottom: spacing.xl, gap: spacing.md },
  staticContent: { paddingHorizontal: screenPadding, paddingBottom: spacing.lg },
  footer: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.sm,
    gap: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.colors.border,
    backgroundColor: t.colors.background,
  },
  dialogBackdrop: { flex: 1, backgroundColor: t.colors.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  dialog: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: t.colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.xs,
    alignItems: 'center',
    ...shadows.float,
  },
  dialogIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: t.colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxs,
  },
  dialogIconDanger: { backgroundColor: t.colors.dangerTint },
  dialogTitle: { ...typography.title3, color: t.colors.ink, textAlign: 'center' },
  dialogMessage: { ...typography.caption, color: t.colors.inkSecondary, textAlign: 'center', lineHeight: 20 },
  dialogActions: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm, alignSelf: 'stretch' },
  dialogButton: { flex: 1 },
}));
