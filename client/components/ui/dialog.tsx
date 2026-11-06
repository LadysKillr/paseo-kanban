import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
  Platform,
  useWindowDimensions,
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

/** Clears the status bar and Dynamic Island on phones. */
const NATIVE_TOP_INSET = 60;

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
  const screen = useWindowDimensions();
  // On iOS/Android the Modal root can be resized by the host around keyboard
  // events and not restored, so the overlay is sized from the screen itself.
  // Native Yoga also collapses flex:1 bodies inside an auto-height card to
  // zero, so contained dialogs get a definite pixel height that stays clear of
  // the status bar / Dynamic Island and of the keyboard.
  const nativeOverlay: ViewStyle | undefined = native
    ? {
        position: "absolute",
        top: 0,
        left: 0,
        width: screen.width,
        height: screen.height,
        paddingTop: NATIVE_TOP_INSET,
        paddingBottom: 24 + keyboardInset,
      }
    : undefined;
  const nativeHeight =
    native && (viewportHeight || scroll === "contained")
      ? Math.max(
          160,
          Math.min(
            screen.height * 0.8,
            screen.height - keyboardInset - NATIVE_TOP_INSET - 24 - 16,
          ),
        )
      : undefined;

  const changeOpen = (next: boolean) => {
    if (next || canClose()) onOpenChange(next);
  };
  const bodyStyle = [styles.bodyBase, contentStyle];

  if (!open) return null;

  const resolvedCloseLabel = closeLabel ?? t("common.close");

  return (
    <WebDialogPortal onDismiss={() => changeOpen(false)}>
      <View style={[styles.overlay, nativeOverlay]}>
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
