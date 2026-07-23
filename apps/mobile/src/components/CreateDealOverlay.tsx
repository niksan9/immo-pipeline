/**
 * "Deal anlegen" full-screen overlay — README "4. Deal anlegen (Overlay)".
 *
 * Reachable from both the pipeline ⋮ action menu and the bottom-nav central +.
 * Top: an optional "Unterlagen hochladen / Portal-Link" entry that opens the
 * existing DocUploadFlow (after Übernehmen it only toasts — it deliberately does
 * not prefill the manual form; keeping the create path simple). Below: the
 * manual form. Objektart + address are optional; the "Aktuell vermietet / Nicht
 * vermietet" status is mandatory (no default) and the primary "Deal anlegen"
 * button stays disabled until status + Kaufpreis + Wohnfläche are valid.
 */

import * as React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Objektart, VermietetStatus } from '@dealpilot/core';
import { colors, radii } from '../theme/tokens';
import { fonts } from '../theme/typography';
import { DocUploadFlow } from './detail/DocUploadFlow';
import type { CreateDealInput } from '../data/deals';

export interface CreateDealOverlayProps {
  visible: boolean;
  onClose: () => void;
  /** Called with the validated input; the caller creates + navigates. */
  onSubmit: (input: CreateDealInput) => void;
  onToast: (msg: string) => void;
}

const ART_OPTIONS: Objektart[] = ['ETW', 'MFH', 'Haus'];

/** Strip everything but digits and parse (de-DE grouping tolerant). */
function parseIntLoose(text: string): number {
  const n = parseInt(text.replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

export function CreateDealOverlay({
  visible,
  onClose,
  onSubmit,
  onToast,
}: CreateDealOverlayProps) {
  const insets = useSafeAreaInsets();

  const [art, setArt] = React.useState<Objektart>('ETW');
  const [street, setStreet] = React.useState('');
  const [plz, setPlz] = React.useState('');
  const [ort, setOrt] = React.useState('');
  const [vermietet, setVermietet] = React.useState<VermietetStatus | null>(null);
  const [preis, setPreis] = React.useState('');
  const [qm, setQm] = React.useState('');
  const [rent, setRent] = React.useState('');
  const [docFlowOpen, setDocFlowOpen] = React.useState(false);

  // Reset to a clean form each time the overlay (re)opens.
  React.useEffect(() => {
    if (visible) {
      setArt('ETW');
      setStreet('');
      setPlz('');
      setOrt('');
      setVermietet(null);
      setPreis('');
      setQm('');
      setRent('');
      setDocFlowOpen(false);
    }
  }, [visible]);

  const kaufpreis = parseIntLoose(preis);
  const flaeche = parseIntLoose(qm);
  const valid = vermietet != null && kaufpreis > 0 && flaeche > 0;

  const submit = () => {
    if (!valid || vermietet == null) return;
    onSubmit({
      objektart: art,
      address: street,
      plz,
      ort,
      vermietet,
      kaufpreis,
      qm: flaeche,
      rent: parseIntLoose(rent),
    });
  };

  if (!visible) return null;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top }]} testID="create-overlay">
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={onClose}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Schließen"
            testID="create-close"
          >
            <Svg width={18} height={18} fill="none" stroke={colors.ink} strokeWidth={2}>
              <Path d="M4 4l10 10M14 4L4 14" />
            </Svg>
          </Pressable>
          <Text style={styles.headerTitle}>Neuer Deal</Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Optional upload / portal entry */}
          <Pressable
            onPress={() => setDocFlowOpen(true)}
            accessibilityRole="button"
            style={styles.uploadRow}
            testID="create-upload"
          >
            <Svg width={16} height={16} fill="none" stroke={colors.teal} strokeWidth={1.7}>
              <Path d="M8 3v9M5 8l3 3 3-3" />
              <Path d="M3 13v1h10v-1" />
            </Svg>
            <Text style={styles.uploadText}>Unterlagen hochladen / Portal-Link</Text>
            <Text style={styles.uploadHint}>optional</Text>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ODER SELBST EINTRAGEN</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Objektart */}
          <Text style={styles.miniLabel}>OBJEKTART</Text>
          <View style={styles.segTrack}>
            {ART_OPTIONS.map((opt) => {
              const active = opt === art;
              return (
                <Pressable
                  key={opt}
                  onPress={() => setArt(opt)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[styles.seg, active && styles.segActive]}
                  testID={`create-art-${opt}`}
                >
                  <Text style={[styles.segLabel, active && styles.segLabelActive]}>{opt}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Adresse (optional) */}
          <Text style={styles.miniLabel}>
            ADRESSE <Text style={styles.miniLabelHint}>· optional</Text>
          </Text>
          <TextInput
            value={street}
            onChangeText={setStreet}
            placeholder="Straße & Nr. (falls bekannt)"
            placeholderTextColor={colors.faintAlt}
            style={styles.input}
            testID="create-street"
          />
          <View style={styles.addrRow}>
            <TextInput
              value={plz}
              onChangeText={setPlz}
              placeholder="PLZ"
              placeholderTextColor={colors.faintAlt}
              keyboardType="numeric"
              style={[styles.input, styles.plzInput]}
              testID="create-plz"
            />
            <TextInput
              value={ort}
              onChangeText={setOrt}
              placeholder="Ort"
              placeholderTextColor={colors.faintAlt}
              style={[styles.input, styles.ortInput]}
              testID="create-ort"
            />
          </View>

          {/* Status (mandatory) */}
          <Text style={styles.miniLabel}>STATUS</Text>
          <View style={styles.segTrack}>
            {(
              [
                { key: 'vermietet', label: 'Aktuell vermietet' },
                { key: 'nicht_vermietet', label: 'Nicht vermietet' },
              ] as { key: VermietetStatus; label: string }[]
            ).map((opt) => {
              const active = opt.key === vermietet;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setVermietet(opt.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[styles.seg, active && styles.segActive]}
                  testID={`create-verm-${opt.key}`}
                >
                  <Text style={[styles.segLabel, active && styles.segLabelActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Kaufpreis + Wohnfläche */}
          <View style={styles.twoCol}>
            <View style={styles.col}>
              <Text style={styles.miniLabel}>KAUFPREIS</Text>
              <TextInput
                value={preis}
                onChangeText={setPreis}
                placeholder="€"
                placeholderTextColor={colors.faintAlt}
                keyboardType="numeric"
                style={[styles.input, styles.monoInput]}
                testID="create-preis"
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.miniLabel}>WOHNFLÄCHE</Text>
              <TextInput
                value={qm}
                onChangeText={setQm}
                placeholder="m²"
                placeholderTextColor={colors.faintAlt}
                keyboardType="numeric"
                style={[styles.input, styles.monoInput]}
                testID="create-qm"
              />
            </View>
          </View>

          {/* Kaltmiete (optional) */}
          <Text style={styles.miniLabel}>
            KALTMIETE / MONAT <Text style={styles.miniLabelHint}>· optional</Text>
          </Text>
          <TextInput
            value={rent}
            onChangeText={setRent}
            placeholder="€"
            placeholderTextColor={colors.faintAlt}
            keyboardType="numeric"
            style={[styles.input, styles.monoInput]}
            testID="create-rent"
          />
          <View style={{ height: 8 }} />
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            onPress={submit}
            disabled={!valid}
            accessibilityRole="button"
            accessibilityState={{ disabled: !valid }}
            style={[styles.primaryBtn, !valid && styles.primaryBtnDisabled]}
            testID="create-submit"
          >
            <Text style={styles.primaryText}>Deal anlegen</Text>
          </Pressable>
        </View>

        {/* Optional document flow (does not prefill the form — see file header) */}
        <DocUploadFlow
          visible={docFlowOpen}
          onClose={() => setDocFlowOpen(false)}
          onApply={() => setDocFlowOpen(false)}
          onToast={onToast}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgApp },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  iconBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontFamily: fonts.bricolage700, fontSize: 15, color: colors.ink },

  scroll: { flex: 1 },
  content: { padding: 16 },

  uploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#b6cdc4',
    borderRadius: radii.chip,
    paddingVertical: 11,
    paddingHorizontal: 13,
  },
  uploadText: { flex: 1, fontFamily: fonts.hanken500, fontSize: 12, color: colors.tealText },
  uploadHint: { fontFamily: fonts.mono400, fontSize: 10, color: colors.muted2 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 15 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e0ddd7' },
  dividerText: { fontFamily: fonts.mono500, fontSize: 9.5, letterSpacing: 0.4, color: colors.faintAlt },

  miniLabel: {
    fontFamily: fonts.mono600,
    fontSize: 9,
    letterSpacing: 0.7,
    color: colors.muted2,
    marginTop: 14,
    marginBottom: 6,
  },
  miniLabelHint: { color: colors.faintAlt },

  segTrack: {
    flexDirection: 'row',
    backgroundColor: colors.chipBgAlt,
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  seg: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
  },
  segActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 2,
    elevation: 1,
  },
  segLabel: { fontFamily: fonts.hanken600, fontSize: 12, color: colors.muted2 },
  segLabelActive: { color: colors.ink },

  input: {
    width: '100%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 13,
    fontFamily: fonts.hanken400,
    fontSize: 13,
    color: colors.ink,
  },
  monoInput: { fontFamily: fonts.mono600 },
  addrRow: { flexDirection: 'row', gap: 9, marginTop: 8 },
  plzInput: { width: 104 },
  ortInput: { flex: 1, minWidth: 0 },

  twoCol: { flexDirection: 'row', gap: 9 },
  col: { flex: 1 },

  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  primaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    backgroundColor: colors.dark,
    borderRadius: radii.buttonLg,
  },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryText: { fontFamily: fonts.hanken600, fontSize: 14, color: '#fff' },
});
