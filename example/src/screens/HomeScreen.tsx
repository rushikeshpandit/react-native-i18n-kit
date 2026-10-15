import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useDeviceLocale, useTranslation } from 'react-native-i18n-kit';
import { ApiExplorer } from '../components/ApiExplorer';
import { LanguageSelector } from '../components/LanguageSelector';

/**
 * A small labeled row used throughout the "device info" card below.
 *
 * @param props.label - Left-hand caption.
 * @param props.value - Right-hand value.
 * @returns A single label/value row.
 */
function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.ReactElement {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

/**
 * Main screen of the example app: language switcher, plural demo, native
 * device-locale card and the on-device API Explorer.
 *
 * @returns The scrollable home screen, laid out right-to-left when the active
 * locale is RTL.
 */
export function HomeScreen(): React.ReactElement {
  const { t, isRTL } = useTranslation();
  const device = useDeviceLocale();
  const [itemCount, setItemCount] = useState(0);

  return (
    <ScrollView
      contentContainerStyle={[styles.container, isRTL && styles.containerRTL]}
      style={isRTL ? styles.directionRTL : styles.directionLTR}
    >
      <Text style={styles.title}>{t('common.appTitle')}</Text>
      <Text style={styles.greeting}>
        {t('home.greeting', { name: 'Rushikesh' })}
      </Text>
      <Text style={styles.subtitle}>{t('home.subtitle')}</Text>

      <Text style={styles.sectionTitle}>{t('home.languageSectionTitle')}</Text>
      <LanguageSelector />

      <View style={styles.counterRow}>
        <Text style={styles.itemCountText}>
          {t('home.itemCount', { count: itemCount })}
        </Text>
        <View style={styles.counterButtons}>
          <Text
            accessibilityRole="button"
            onPress={() => setItemCount((c) => c + 1)}
            style={styles.counterButton}
          >
            {t('home.addItem')}
          </Text>
          <Text
            accessibilityRole="button"
            onPress={() => setItemCount((c) => Math.max(0, c - 1))}
            style={styles.counterButton}
          >
            {t('home.removeItem')}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>
        {t('home.deviceInfoSectionTitle')}
      </Text>
      <View style={styles.card}>
        <InfoRow label={t('home.country')} value={device.country} />
        <InfoRow label={t('home.calendar')} value={device.calendar} />
        <InfoRow label={t('home.timeZone')} value={device.timeZone} />
        <InfoRow
          label={t('home.decimalSeparator')}
          value={device.numberFormatSettings.decimalSeparator}
        />
        <InfoRow
          label={t('home.groupingSeparator')}
          value={device.numberFormatSettings.groupingSeparator}
        />
        <InfoRow
          label={t('home.clockFormat')}
          value={
            device.uses24HourClock ? t('home.clock24h') : t('home.clock12h')
          }
        />
        <InfoRow
          label={t('home.measurementSystem')}
          value={
            device.usesMetricSystem ? t('home.metric') : t('home.imperial')
          }
        />
        <InfoRow
          label={t('home.writingDirection')}
          value={isRTL ? t('home.rtl') : t('home.ltr')}
        />
      </View>

      <ApiExplorer />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 60,
    gap: 12,
  },
  directionLTR: { direction: 'ltr' },
  directionRTL: { direction: 'rtl' },
  containerRTL: {
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#101828',
  },
  greeting: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1B6B5A',
  },
  subtitle: {
    fontSize: 14,
    color: '#667085',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#101828',
    marginTop: 12,
  },
  counterRow: {
    marginTop: 16,
    gap: 8,
  },
  itemCountText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#101828',
  },
  counterButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  counterButton: {
    color: '#1B6B5A',
    fontWeight: '700',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    gap: 10,
    width: '100%',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 13,
    color: '#667085',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#101828',
  },
});
