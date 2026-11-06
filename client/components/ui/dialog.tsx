import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
  Platform,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Icon } from "@getpaseo/plugin/client/react-native";
import type { PluginSurfaceProps } from "@getpaseo/plugin/client";
import {
  WebDialogPortal,
  useDialogInputFocus,
  useNativeKeyboardInset,
} from "../../platform/web";
import { useI18n } from "../../platform/i18n";

export interface DialogProps {
  title: string;
  icon?: ReactNode;
  open?: boolean;
  onOpenChange: (open: boolean) => void;
  canClose?: () => boolean;
  theme: PluginSurfaceProps["theme"];
  maxWidth?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  /** Content scrolls as a whole, or owns a bounded list/form and fixed footer. */
  scroll?: "content" | "contained";
  contentStyle?: StyleProp<ViewStyle>;
  inputFocus?: boolean;
  actions?: ReactNode;
  children: ReactNode;
  closeLabel?: string;
}

export function Dialog({
  title,
  icon,
  open = true,
  onOpenChange,
  canClose = () => true,
  theme,
  maxWidth = 520,
  viewportWidth,
  viewportHeight,
  scroll = "content",
  contentStyle,
  inputFocus = false,
  actions,
  children,
  closeLabel,
}: DialogProps) {
  const { t } = useI18n();
  const colors = theme.colors;
  const inputFocusId = useDialogInputFocus(
    open && inputFocus ? colors.accent : undefined,
  );

  const keyboardInset = useNativeKeyboardInset();
  const native = Platform.OS !== "web";
  // Native Yoga collapses flex:1 bodies inside an auto-height card to zero, so
  // contained dialogs get a definite height on iOS/Android.
  // Desktop vh sizes are too short on a phone; use one tall sheet size, which
  // also keeps the card clear of the status bar / Dynamic Island.
  const nativeHeight =
    native && (viewportHeight || scroll === "contained") ? "80%" : undefined;

  const changeOpen = (next: boolean) => {
    if (next || canClose()) onOpenChange(next);
  };
  const bodyStyle = [styles.bodyBase, contentStyle];

  if (!open) return null;

  const resolvedCloseLabel = closeLabel ?? t("common.close");

  return (
    <WebDialogPortal onDismiss={() => changeOpen(false)}>
      <View
        style={[
          styles.overlay,
          keyboardInset > 0 && { paddingBottom: 24 + keyboardInset },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => changeOpen(false)}
          accessible={false}
          focusable={false}
        />
        <View
          role="dialog"
          aria-modal
          accessibilityViewIsModal
          accessibilityLabel={title}
          tabIndex={-1}
          {...({ dataSet: { dialogCard: "" } } as Record<string, unknown>)}
          style={[
            styles.card,
            {
              maxWidth,
              width: viewportWidth
                ? (`${viewportWidth}${Platform.OS === "web" ? "vw" : "%"}` as DimensionValue)
                : "100%",
              height: native
                ? (nativeHeight as DimensionValue | undefined)
                : viewportHeight
                  ? (`${viewportHeight}vh` as DimensionValue)
                  : undefined,
              backgroundColor: colors.surface1,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            {icon}
            <Text
              numberOfLines={1}
              style={[styles.title, { color: colors.foreground }]}
            >
              {title}
            </Text>
            {actions}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={resolvedCloseLabel}
              hitSlop={8}
              onPress={() => changeOpen(false)}
              disabled={!canClose()}
              {...({
                dataSet: { dialogClose: "" },
                "data-dialog-close": "",
              } as Record<string, unknown>)}
              style={({ pressed }) => [
                styles.close,
                pressed && { backgroundColor: colors.surface2 },
              ]}
            >
              <Icon name="X" size={18} color={colors.foregroundMuted} />
            </Pressable>
          </View>
          {scroll === "content" ? (
            <View
              nativeID={inputFocusId}
              style={[
                styles.scrollSurface,
                { backgroundColor: colors.surface0 },
              ]}
            >
              <ScrollView
                style={native ? styles.nativeScroll : undefined}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={bodyStyle}
              >
                {children}
              </ScrollView>
            </View>
          ) : (
            <View
              nativeID={inputFocusId}
              style={[{ backgroundColor: colors.surface0 }, bodyStyle]}
            >
              {children}
            </View>
          )}
        </View>
      </View>
    </WebDialogPortal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    maxHeight: "90%",
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    overflow: "hidden",
    ...Platform.select({
      web: {
        outlineWidth: 0,
      },
    }),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
  },
  close: {
    padding: 4,
    borderRadius: 4,
  },
  nativeScroll: {
    flexGrow: 0,
  },
  scrollSurface: {
    flexShrink: 1,
    minHeight: 0,
  },
  bodyBase: {
    padding: 24,
    gap: 16,
    minHeight: 0,
    flexShrink: 1,
  },
});
