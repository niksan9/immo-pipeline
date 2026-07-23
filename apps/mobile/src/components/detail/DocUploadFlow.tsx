/**
 * Dokumenten-Upload-Flow overlay — README "5. Dokumenten-Upload-Flow" (4 steps).
 *
 *   1. Hinzufügen  — simulated drop area (tap adds a fake file), removable file
 *                    list, optional context field, "Analysieren".
 *   2. KI verarbeitet — generic dark animation (rotating ring + pulsing doc
 *                    icon), calm status line, NO progress percent. Auto-advances
 *                    to step 3 after ~2.1 s (test-controllable timer).
 *   3. Rückfrage   — one scripted targeted question with quick-answer chips
 *                    (+ page ref) and free text; skippable.
 *   4. Ergebnis    — summary, overridable category chips (▾ → picker), the
 *                    documents split from one file, photo hint,
 *                    "Falsch erkannt? … neu analysieren" (→ step 2) and
 *                    "Übernehmen" (adds documents, toast, closes).
 *
 * Everything is client-side simulated — no real upload / picker / AI. There is
 * NO expo-document-picker dependency; the picker is faked from a small pool.
 */

import * as React from 'react';
import {
  Animated,
  Easing,
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
import { colors, radii } from '../../theme/tokens';
import { fonts } from '../../theme/typography';
import { Sheet } from '../Sheet';
import { CheckIcon, DocIcon } from '../icons';
import {
  DOC_CATEGORIES,
  FLOW_PHOTO_DOC,
  FLOW_RESULT_DOCS,
  type DealDocument,
  type DocCategory,
} from '../../data/documents';

/** Delay before step 2 auto-advances to step 3 (prototype ~2.1 s). */
export const ANALYZE_MS = 2100;

type Step = 'add' | 'analyzing' | 'question' | 'result';

interface FakeFile {
  id: string;
  name: string;
  size: string;
  kind: 'pdf' | 'img';
  photos?: number;
}

const INITIAL_FILES: FakeFile[] = [
  { id: 'f-expose', name: 'expose_lindenstr.pdf', size: '2,4 MB', kind: 'pdf' },
  { id: 'f-etv', name: 'etv_protokolle_23-25.pdf', size: '6,1 MB · 3 Jahrgänge', kind: 'pdf' },
  { id: 'f-fotos', name: 'fotos_objekt (5)', size: 'JPG', kind: 'img', photos: 5 },
];

/** Extra files the simulated picker "finds" on each drop-area tap. */
const FILE_POOL: FakeFile[] = [
  { id: 'f-grundbuch', name: 'grundbuchauszug_2025.pdf', size: '1,1 MB', kind: 'pdf' },
  { id: 'f-wohngeld', name: 'wohngeldabrechnung.pdf', size: '0,9 MB', kind: 'pdf' },
  { id: 'f-energie', name: 'energieausweis.pdf', size: '0,6 MB', kind: 'pdf' },
];

export interface DocUploadFlowProps {
  visible: boolean;
  onClose: () => void;
  /** Merge the recognised documents into the deal (store dedupes by id). */
  onApply: (docs: DealDocument[]) => void;
  onToast: (msg: string) => void;
}

export function DocUploadFlow({ visible, onClose, onApply, onToast }: DocUploadFlowProps) {
  const insets = useSafeAreaInsets();

  const [step, setStep] = React.useState<Step>('add');
  const [files, setFiles] = React.useState<FakeFile[]>(INITIAL_FILES);
  const [poolIdx, setPoolIdx] = React.useState(0);
  const [context, setContext] = React.useState('');
  const [answer, setAnswer] = React.useState('');
  const [overrides, setOverrides] = React.useState<Record<string, DocCategory>>({});
  const [pickerFor, setPickerFor] = React.useState<string | null>(null);

  // Reset to a clean state whenever the overlay is (re)opened.
  React.useEffect(() => {
    if (visible) {
      setStep('add');
      setFiles(INITIAL_FILES);
      setPoolIdx(0);
      setContext('');
      setAnswer('');
      setOverrides({});
      setPickerFor(null);
    }
  }, [visible]);

  // Step 2 → 3 auto-advance (the single test-controllable timer).
  React.useEffect(() => {
    if (step !== 'analyzing') return;
    const t = setTimeout(() => setStep('question'), ANALYZE_MS);
    return () => clearTimeout(t);
  }, [step]);

  const addFile = () => {
    const next = FILE_POOL[poolIdx % FILE_POOL.length]!;
    setPoolIdx((i) => i + 1);
    // Suffix keeps ids unique if the pool wraps around.
    setFiles((prev) => [...prev, { ...next, id: `${next.id}-${prev.length}` }]);
  };
  const removeFile = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id));

  const catOf = (doc: DealDocument): DocCategory => overrides[doc.id] ?? doc.category;

  const apply = () => {
    const docs = [...FLOW_RESULT_DOCS, FLOW_PHOTO_DOC].map((d) => ({
      ...d,
      category: overrides[d.id] ?? d.category,
    }));
    onApply(docs);
    onToast('Dokumente eingeordnet');
    onClose();
  };

  if (!visible) return null;

  const docCount = files.filter((f) => f.kind !== 'img').length;
  const photoCount = files.reduce((n, f) => n + (f.photos ?? 0), 0);
  const splitDocs = FLOW_RESULT_DOCS.filter((d) => d.splitFrom);

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top }]} testID="doc-flow">
        {/* Header (hidden on the dark analyzing step) */}
        {step !== 'analyzing' && (
          <View style={styles.header}>
            <Pressable
              onPress={onClose}
              style={styles.iconBtn}
              accessibilityRole="button"
              accessibilityLabel="Schließen"
            >
              <Svg width={18} height={18} fill="none" stroke={colors.ink} strokeWidth={2}>
                <Path d="M4 4l10 10M14 4L4 14" />
              </Svg>
            </Pressable>
            <Text style={styles.headerTitle}>Dokumente</Text>
          </View>
        )}

        {/* STEP 1 — ADD */}
        {step === 'add' && (
          <>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content} testID="doc-flow-add">
              <Text style={styles.h1}>Dokumente hinzufügen</Text>
              <Text style={styles.sub}>
                Alles reinwerfen – die KI liest und ordnet automatisch alles ein.
              </Text>

              <Pressable
                onPress={addFile}
                accessibilityRole="button"
                style={styles.dropArea}
                testID="doc-flow-drop"
              >
                <Svg width={20} height={20} fill="none" stroke={colors.teal} strokeWidth={1.7}>
                  <Path d="M10 3v10M6 9l4 4 4-4" />
                  <Path d="M3 15v2h14v-2" />
                </Svg>
                <Text style={styles.dropText}>Dateien / Kamera / Fotos</Text>
              </Pressable>

              <Text style={styles.miniLabel}>HINZUGEFÜGT · {files.length}</Text>
              {files.map((f) => (
                <View key={f.id} style={styles.fileRow} testID={`doc-flow-file-${f.id}`}>
                  <DocIcon size={17} color={colors.muted2} />
                  <View style={styles.fileInfo}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {f.name}
                    </Text>
                    <Text style={styles.fileSize}>{f.size}</Text>
                  </View>
                  <Pressable
                    onPress={() => removeFile(f.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${f.name} entfernen`}
                    testID={`doc-flow-remove-${f.id}`}
                    hitSlop={8}
                  >
                    <Svg width={14} height={14} fill="none" stroke="#c2bfb8" strokeWidth={1.8}>
                      <Path d="M3 3l8 8M11 3l-8 8" />
                    </Svg>
                  </Pressable>
                </View>
              ))}

              <View style={styles.contextCard}>
                <Text style={styles.miniLabelFlat}>KONTEXT · OPTIONAL</Text>
                <TextInput
                  value={context}
                  onChangeText={setContext}
                  placeholder="z. B. „Verkäufer sagt, Dach sei 2019 neu gemacht“ …"
                  placeholderTextColor={colors.faintAlt}
                  multiline
                  style={styles.contextInput}
                  testID="doc-flow-context"
                />
              </View>
            </ScrollView>
            <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
              <Pressable
                onPress={() => setStep('analyzing')}
                accessibilityRole="button"
                style={[styles.primaryBtn, files.length === 0 && styles.primaryBtnDisabled]}
                disabled={files.length === 0}
                testID="doc-flow-analyze"
              >
                <Text style={styles.primaryText}>Analysieren</Text>
              </Pressable>
            </View>
          </>
        )}

        {/* STEP 2 — ANALYZING */}
        {step === 'analyzing' && (
          <View style={[styles.analyzing, { paddingTop: insets.top + 30 }]} testID="doc-flow-analyzing">
            <AnalyzingAnimation />
            <Text style={styles.analyzeTitle}>KI analysiert …</Text>
            <Text style={styles.analyzeSub}>
              Deine Dokumente werden gelesen und eingeordnet. Das dauert einen Moment – du
              kannst die App schließen, wir melden uns.
            </Text>
            <Text style={styles.analyzeStatus}>
              liest {docCount} {docCount === 1 ? 'Dokument' : 'Dokumente'}
              {photoCount > 0 ? ` · ${photoCount} Fotos` : ''}
            </Text>
          </View>
        )}

        {/* STEP 3 — QUESTION */}
        {step === 'question' && (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} testID="doc-flow-question">
            <View style={styles.qHead}>
              <View style={styles.qChip}>
                <View style={styles.qDot} />
                <Text style={styles.qChipText}>RÜCKFRAGE · 1 VON 2</Text>
              </View>
              <Pressable onPress={() => setStep('result')} accessibilityRole="button" testID="doc-flow-skip">
                <Text style={styles.skip}>Überspringen</Text>
              </Pressable>
            </View>

            <View style={styles.qBubbleRow}>
              <View style={styles.kiAvatar}>
                <Text style={styles.kiAvatarText}>KI</Text>
              </View>
              <View style={styles.qBubble}>
                <Text style={styles.qText}>
                  Im Wirtschaftsplan finde ich zwei mögliche Hausgeld-Werte. Welcher ist der
                  nicht umlegbare Anteil?
                </Text>
              </View>
            </View>

            <View style={styles.answers}>
              {[
                { value: '115 €/Monat', page: 'S. 2' },
                { value: '248 €/Monat', page: 'S. 4' },
              ].map((a) => (
                <Pressable
                  key={a.value}
                  onPress={() => setStep('result')}
                  accessibilityRole="button"
                  style={styles.answerRow}
                  testID={`doc-flow-answer-${a.page.replace(/\W/g, '')}`}
                >
                  <Text style={styles.answerText}>{a.value}</Text>
                  <Text style={styles.answerPage}>{a.page}</Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              value={answer}
              onChangeText={setAnswer}
              placeholder="Eigene Antwort / Kontext …"
              placeholderTextColor={colors.faintAlt}
              style={styles.freeAnswer}
              onSubmitEditing={() => setStep('result')}
              testID="doc-flow-answer-free"
            />
          </ScrollView>
        )}

        {/* STEP 4 — RESULT */}
        {step === 'result' && (
          <>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content} testID="doc-flow-result">
              <Text style={styles.h1}>Eingeordnet</Text>
              <Text style={styles.sub}>
                {FLOW_RESULT_DOCS.length} Dokumente · aus der ETV-Datei wurden {splitDocs.length}{' '}
                Jahrgänge getrennt. Tippen zum Ändern.
              </Text>

              {/* Exposé card */}
              <View style={styles.resultCard}>
                <View style={styles.resultCardHead}>
                  <Text style={styles.resultName}>expose_lindenstr.pdf</Text>
                  <CategoryChip
                    label={catOf(FLOW_RESULT_DOCS[0]!)}
                    onPress={() => setPickerFor(FLOW_RESULT_DOCS[0]!.id)}
                    testID="doc-flow-cat-expose"
                  />
                </View>
                <Text style={styles.resultSummary}>
                  68 m² ETW, Baujahr 1998, Kaltmiete 800 €, Angebot 189.000 €.
                </Text>
              </View>

              {/* Split-from-one-file section */}
              <View style={styles.splitCard}>
                <View style={styles.splitHead}>
                  <Svg width={13} height={13} fill="none" stroke={colors.teal} strokeWidth={1.8}>
                    <Path d="M3 6h7M3 3h7M3 9h4" />
                  </Svg>
                  <Text style={styles.splitLabel}>AUS 1 DATEI AUFGETEILT</Text>
                </View>
                {splitDocs.map((d) => (
                  <View key={d.id} style={styles.splitRow} testID={`doc-flow-split-${d.id}`}>
                    <Text style={styles.splitName}>{d.name}</Text>
                    <CategoryChip
                      label={catOf(d)}
                      onPress={() => setPickerFor(d.id)}
                      testID={`doc-flow-cat-${d.id}`}
                    />
                  </View>
                ))}
              </View>

              {/* Photo hint */}
              <View style={styles.photoHint}>
                <View style={styles.photoDot} />
                <Text style={styles.photoText}>fotos_objekt → 1 Hinweis (Feuchtefleck)</Text>
                <CategoryChip
                  label={catOf(FLOW_PHOTO_DOC)}
                  tone="hint"
                  onPress={() => setPickerFor(FLOW_PHOTO_DOC.id)}
                  testID="doc-flow-cat-foto"
                />
              </View>

              <Pressable
                onPress={() => setStep('analyzing')}
                accessibilityRole="button"
                style={styles.reAnalyze}
                testID="doc-flow-reanalyze"
              >
                <Svg width={13} height={13} fill="none" stroke={colors.muted2} strokeWidth={1.7}>
                  <Path d="M2.5 3.5v3h3M11 9.5V6.5h-3" />
                  <Path d="M3.5 6.5a4 4 0 017-1.2M10.5 6.5a4 4 0 01-7 1.2" />
                </Svg>
                <Text style={styles.reAnalyzeText}>Falsch erkannt? Mit Hinweisen neu analysieren</Text>
              </Pressable>
            </ScrollView>
            <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
              <Pressable onPress={apply} accessibilityRole="button" style={styles.primaryBtn} testID="doc-flow-apply">
                <Text style={styles.primaryText}>Übernehmen</Text>
              </Pressable>
            </View>
          </>
        )}

        {/* Category picker */}
        <Sheet visible={pickerFor != null} onClose={() => setPickerFor(null)} testID="doc-flow-cat-picker">
          <Text style={styles.pickerTitle}>Kategorie</Text>
          <ScrollView style={styles.pickerList}>
            {DOC_CATEGORIES.map((cat) => {
              const active =
                pickerFor != null &&
                (overrides[pickerFor] ??
                  [...FLOW_RESULT_DOCS, FLOW_PHOTO_DOC].find((d) => d.id === pickerFor)?.category) ===
                  cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => {
                    if (pickerFor != null) {
                      setOverrides((prev) => ({ ...prev, [pickerFor]: cat }));
                    }
                    setPickerFor(null);
                  }}
                  accessibilityRole="button"
                  style={styles.pickerRow}
                  testID={`doc-flow-pick-${cat}`}
                >
                  <Text style={styles.pickerRowText}>{cat}</Text>
                  {active && <CheckIcon size={15} color={colors.green} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </Sheet>
      </View>
    </Modal>
  );
}

/** Small tappable category chip with a ▾ affordance. */
function CategoryChip({
  label,
  onPress,
  tone = 'teal',
  testID,
}: {
  label: string;
  onPress: () => void;
  tone?: 'teal' | 'hint';
  testID?: string;
}) {
  const hint = tone === 'hint';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.catChip, hint ? styles.catChipHint : styles.catChipTeal]}
      testID={testID}
    >
      <Text style={[styles.catChipText, { color: hint ? colors.yellow : colors.tealText }]}>
        {label} ▾
      </Text>
    </Pressable>
  );
}

/** Generic "processing" animation: rotating ring + pulsing document icon. */
function AnalyzingAnimation() {
  const spin = React.useRef(new Animated.Value(0)).current;
  const pulse = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const spinLoop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    spinLoop.start();
    pulseLoop.start();
    return () => {
      spinLoop.stop();
      pulseLoop.stop();
    };
  }, [spin, pulse]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.06] });

  return (
    <View style={styles.animWrap} testID="doc-flow-anim">
      <View style={styles.ringTrack} />
      <Animated.View style={[styles.ringArc, { transform: [{ rotate }] }]} />
      <Animated.View style={[styles.animCore, { transform: [{ scale }] }]} />
      <Svg width={32} height={32} fill="none" stroke={colors.greenLight} strokeWidth={1.6} style={styles.animIcon}>
        <Path d="M7 3h10l4 4v20H7z" />
        <Path d="M17 3v4h4" />
        <Path d="M11 14h9M11 18h9M11 22h6" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgApp },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  iconBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontFamily: fonts.bricolage700, fontSize: 15, color: colors.ink },

  scroll: { flex: 1 },
  content: { padding: 16 },

  h1: { fontFamily: fonts.bricolage700, fontSize: 18, letterSpacing: -0.18, color: colors.ink },
  sub: { fontFamily: fonts.hanken400, fontSize: 12.5, lineHeight: 18, color: colors.muted, marginTop: 3 },

  dropArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#b6cdc4',
    borderRadius: radii.cardSm,
    backgroundColor: colors.surface,
    padding: 20,
    marginTop: 14,
  },
  dropText: { fontFamily: fonts.hanken600, fontSize: 13, color: colors.tealText },

  miniLabel: {
    fontFamily: fonts.mono600,
    fontSize: 9,
    letterSpacing: 0.7,
    color: colors.muted2,
    marginTop: 15,
    marginBottom: 8,
    marginHorizontal: 2,
  },
  miniLabelFlat: { fontFamily: fonts.mono600, fontSize: 9, letterSpacing: 0.7, color: colors.muted2 },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.chip,
    paddingVertical: 11,
    paddingHorizontal: 13,
    marginBottom: 8,
  },
  fileInfo: { flex: 1, minWidth: 0 },
  fileName: { fontFamily: fonts.hanken600, fontSize: 12.5, color: colors.ink },
  fileSize: { fontFamily: fonts.mono400, fontSize: 10, color: colors.muted2, marginTop: 1 },

  contextCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.chip,
    paddingVertical: 11,
    paddingHorizontal: 13,
    marginTop: 4,
  },
  contextInput: {
    fontFamily: fonts.hanken400,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.ink,
    marginTop: 6,
    minHeight: 44,
    textAlignVertical: 'top',
  },

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

  // Analyzing
  analyzing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: colors.dark,
  },
  animWrap: { width: 100, height: 100, alignItems: 'center', justifyContent: 'center' },
  ringTrack: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: colors.darkLine,
  },
  ringArc: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: 'transparent',
    borderTopColor: colors.greenLight,
  },
  animCore: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#26251f',
  },
  animIcon: { position: 'relative' },
  analyzeTitle: {
    fontFamily: fonts.bricolage700,
    fontSize: 18,
    letterSpacing: -0.18,
    color: '#fff',
    marginTop: 22,
  },
  analyzeSub: {
    fontFamily: fonts.hanken400,
    fontSize: 12.5,
    lineHeight: 19,
    color: '#a8a49c',
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 250,
  },
  analyzeStatus: {
    fontFamily: fonts.mono500,
    fontSize: 11,
    letterSpacing: 0.4,
    color: colors.greenLight,
    marginTop: 16,
  },

  // Question
  qHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.tealSoft,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  qDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.teal },
  qChipText: { fontFamily: fonts.mono600, fontSize: 9.5, letterSpacing: 0.6, color: colors.tealText },
  skip: { fontFamily: fonts.hanken500, fontSize: 11, color: colors.faint },

  qBubbleRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  kiAvatar: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kiAvatarText: { fontFamily: fonts.mono600, fontSize: 8, color: '#fff' },
  qBubble: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 13,
    borderTopLeftRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 13,
  },
  qText: { fontFamily: fonts.hanken400, fontSize: 13, lineHeight: 19.5, color: colors.ink },

  answers: { gap: 8, marginTop: 13 },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.chip,
    padding: 13,
  },
  answerText: { fontFamily: fonts.hanken600, fontSize: 12.5, color: colors.ink },
  answerPage: { fontFamily: fonts.mono400, fontSize: 10, color: colors.muted2 },
  freeAnswer: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.chip,
    paddingVertical: 12,
    paddingHorizontal: 13,
    marginTop: 8,
    fontFamily: fonts.hanken400,
    fontSize: 12,
    color: colors.ink,
  },

  // Result
  resultCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 13,
    marginTop: 13,
  },
  resultCardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultName: { fontFamily: fonts.hanken600, fontSize: 12.5, color: colors.ink },
  resultSummary: {
    fontFamily: fonts.hanken400,
    fontSize: 11.5,
    lineHeight: 16.5,
    color: colors.muted,
    marginTop: 6,
  },
  splitCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingBottom: 4,
    marginTop: 9,
  },
  splitHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9 },
  splitLabel: { fontFamily: fonts.mono600, fontSize: 10, letterSpacing: 0.5, color: colors.teal },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  splitName: { fontFamily: fonts.hanken500, fontSize: 12, color: colors.ink },

  catChip: { borderRadius: 6, paddingVertical: 3, paddingHorizontal: 7 },
  catChipTeal: { backgroundColor: colors.tealSoft },
  catChipHint: { backgroundColor: colors.surface },
  catChipText: { fontFamily: fonts.mono500, fontSize: 9.5 },

  photoHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.yellowSoft,
    borderRadius: radii.chip,
    paddingVertical: 11,
    paddingHorizontal: 13,
    marginTop: 9,
  },
  photoDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.yellow },
  photoText: { flex: 1, fontFamily: fonts.hanken500, fontSize: 11.5, color: colors.ink2 },

  reAnalyze: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 14,
  },
  reAnalyzeText: { fontFamily: fonts.hanken600, fontSize: 12, color: colors.muted },

  // Picker sheet
  pickerTitle: {
    fontFamily: fonts.bricolage700,
    fontSize: 16,
    color: colors.ink,
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  pickerList: { paddingHorizontal: 12, maxHeight: 360 },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  pickerRowText: { fontFamily: fonts.hanken500, fontSize: 13.5, color: colors.ink2 },
});
