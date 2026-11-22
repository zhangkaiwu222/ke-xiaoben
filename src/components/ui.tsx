import { Link, type Href } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type ViewStyle,
} from 'react-native';

import { colors, radius, spacing } from '../constants/theme';

export function LoadingScreen({ label = '加载中…' }: { label?: string }) {
  return (
    <View style={ui.center}>
      <ActivityIndicator size="large" color={colors.brand} />
      <Text style={ui.muted}>{label}</Text>
    </View>
  );
}

export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[ui.screen, style]}>{children}</View>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[ui.card, style]}>{children}</View>;
}

export function SectionTitle({ children, right }: { children: string; right?: React.ReactNode }) {
  return (
    <View style={ui.sectionRow}>
      <Text style={ui.sectionTitle}>{children}</Text>
      {right}
    </View>
  );
}

type ButtonProps = PressableProps & {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'pro';
};

export function Button({ label, variant = 'primary', style, ...rest }: ButtonProps) {
  const v = variant === 'primary' ? ui.btnPrimary : variant === 'secondary' ? ui.btnSecondary : variant === 'pro' ? ui.btnPro : ui.btnGhost;
  const t =
    variant === 'primary'
      ? ui.btnPrimaryText
      : variant === 'secondary'
        ? ui.btnSecondaryText
        : variant === 'pro'
          ? ui.btnProText
          : ui.btnGhostText;
  return (
    <Pressable style={({ pressed }) => [v, pressed && ui.pressed, style]} {...rest}>
      <Text style={t}>{label}</Text>
    </Pressable>
  );
}

export function StatTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <View style={[ui.statTile, accent && ui.statTileAccent]}>
      <Text style={ui.statLabel}>{label}</Text>
      <Text style={ui.statValue}>{value}</Text>
      {hint ? <Text style={ui.statHint}>{hint}</Text> : null}
    </View>
  );
}

export function MenuTile({
  href,
  title,
  subtitle,
  emoji,
  pro,
}: {
  href: Href;
  title: string;
  subtitle?: string;
  emoji: string;
  pro?: boolean;
}) {
  return (
    <Link href={href} asChild>
      <Pressable style={({ pressed }) => [ui.menuTile, pressed && ui.pressed]}>
        <Text style={ui.menuEmoji}>{emoji}</Text>
        <View style={ui.menuBody}>
          <View style={ui.menuTitleRow}>
            <Text style={ui.menuTitle}>{title}</Text>
            {pro ? (
              <View style={ui.proBadge}>
                <Text style={ui.proBadgeText}>Pro</Text>
              </View>
            ) : null}
          </View>
          {subtitle ? <Text style={ui.menuSub}>{subtitle}</Text> : null}
        </View>
        <Text style={ui.chevron}>›</Text>
      </Pressable>
    </Link>
  );
}

const ui = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    gap: spacing.sm,
  },
  muted: {
    color: colors.inkMuted,
    fontSize: 14,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '700',
  },
  pressed: { opacity: 0.88 },
  btnPrimary: {
    backgroundColor: colors.brand,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: colors.brandOn,
    fontSize: 16,
    fontWeight: '700',
  },
  btnSecondary: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '600',
  },
  btnPro: {
    backgroundColor: '#2a2318',
    borderWidth: 1,
    borderColor: colors.pro,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  btnProText: {
    color: colors.pro,
    fontSize: 16,
    fontWeight: '700',
  },
  btnGhost: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnGhostText: {
    color: colors.inkDim,
    fontSize: 15,
    fontWeight: '600',
  },
  statTile: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  statTileAccent: {
    borderColor: colors.brandDim,
    backgroundColor: '#142820',
  },
  statLabel: {
    color: colors.inkMuted,
    fontSize: 13,
    marginBottom: 4,
  },
  statValue: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '800',
  },
  statHint: {
    color: colors.inkDim,
    fontSize: 12,
    marginTop: 4,
  },
  menuTile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  menuEmoji: {
    fontSize: 26,
    marginRight: spacing.md,
  },
  menuBody: { flex: 1 },
  menuTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  menuTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  proBadge: {
    backgroundColor: '#2a2318',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.pro,
  },
  proBadgeText: {
    color: colors.pro,
    fontSize: 11,
    fontWeight: '700',
  },
  menuSub: {
    color: colors.inkDim,
    fontSize: 13,
    marginTop: 2,
  },
  chevron: {
    color: colors.inkDim,
    fontSize: 22,
    marginLeft: 8,
  },
});
