/**
 * Deal-Detail screen: fixed header (score / title / meta / price + tab bar) over
 * four tabs — Übersicht, Kalkulation (both fully live via @dealpilot/core),
 * Dokumente and Chat (live from the store's parallel doc / chat slices). All calc
 * state lives in the store, so edits here re-derive the pipeline row too. Tapping
 * a risk row opens the nested Risiko-Detail route (/deal/[id]/risk/[riskId]); a
 * document's "Zum Dokument fragen" opens a linked chat on the Chat tab.
 */

import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  computeScore,
  formatEUR,
  scoreColor,
  type AmpelColor,
  type Measure,
  type Scenario,
} from '@dealpilot/core';

import { useDeals } from '../../../src/data/store';
import { SECTION_LABEL } from '../../../src/lib/pipeline';
import { colors } from '../../../src/theme/tokens';
import { type } from '../../../src/theme/typography';
import { Toast, useToast } from '../../../src/components/Toast';
import {
  DetailHeader,
  type DetailTab,
} from '../../../src/components/detail/DetailHeader';
import { OverviewTab } from '../../../src/components/detail/OverviewTab';
import { CalcTab, type CalcActions } from '../../../src/components/detail/CalcTab';
import { DocsTab } from '../../../src/components/detail/DocsTab';
import { ChatTab, type ChatActions } from '../../../src/components/detail/ChatTab';
import { StubTab } from '../../../src/components/detail/StubTab';
import { DealMenuSheet } from '../../../src/components/detail/DealMenuSheet';
import { StatusSheet } from '../../../src/components/detail/StatusSheet';
import { ObjektdatenSheet } from '../../../src/components/detail/ObjektdatenSheet';
import { CollaborateSheet } from '../../../src/components/detail/CollaborateSheet';
import { ContactSheet } from '../../../src/components/detail/ContactSheet';
import { ConfirmDialog } from '../../../src/components/ConfirmDialog';

export default function DealDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const dealId = typeof id === 'string' ? id : '';
  const store = useDeals();
  const seed = store.getSeed(dealId);
  const state = store.getState(dealId);
  const docs = store.getDocs(dealId);
  const chats = store.getChats(dealId);
  const toast = useToast();

  const [tab, setTab] = React.useState<DetailTab>('overview');

  // Which overlay / sheet is open (UI-only state — not stored).
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [statusOpen, setStatusOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [collabOpen, setCollabOpen] = React.useState(false);
  const [contactOpen, setContactOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const actions = React.useMemo<CalcActions>(
    () => ({
      setScenario: (s: Scenario) => store.setScenario(dealId, s),
      setScenarioPrice: (s: Scenario, p: number) =>
        store.setScenarioPrice(dealId, s, p),
      patchFinancing: (patch) => store.patchFinancing(dealId, patch),
      patchCosts: (patch) => store.patchCosts(dealId, patch),
      patchAssumptions: (patch) => store.patchAssumptions(dealId, patch),
      addMeasure: (m: Measure) => store.addMeasure(dealId, m),
    }),
    [store, dealId],
  );

  const openRisk = React.useCallback(
    (riskId: string) => router.push(`/deal/${dealId}/risk/${riskId}`),
    [router, dealId],
  );

  const chatActions = React.useMemo<ChatActions>(
    () => ({
      sendChatMessage: (text) => store.sendChatMessage(dealId, text),
      addAiReply: (chatId, reply) => store.addAiReply(dealId, chatId, reply),
      newChat: () => store.newChat(dealId),
      setActiveChat: (chatId) => store.setActiveChat(dealId, chatId),
    }),
    [store, dealId],
  );

  /** DocViewer "Zum Dokument fragen": start a linked chat + jump to the Chat tab. */
  const askDocument = React.useCallback(
    (doc: { id: string; name: string }) => {
      store.startDocChat(dealId, doc.id, doc.name);
      setTab('chat');
    },
    [store, dealId],
  );

  if (!seed || !state) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 40 }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.missing}>Deal nicht gefunden.</Text>
      </View>
    );
  }

  const { deal } = state;
  const discarded = deal.dealStatus === 'verworfen';
  const { scoreVal } = computeScore(state.risks);
  const score: number | null = discarded ? null : scoreVal;
  const color: AmpelColor | null = discarded ? null : scoreColor(scoreVal);

  const headerTitle = deal.address ?? deal.ort;
  const meta = `${deal.objektart} · ${deal.ort} · ${deal.qm} m²`;
  const priceStr = formatEUR(deal.kaufpreis);

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <DetailHeader
        title={headerTitle}
        meta={meta}
        priceStr={priceStr}
        score={score}
        color={color}
        tab={tab}
        onTab={setTab}
        onBack={() => router.back()}
        onKebab={() => setMenuOpen(true)}
        topInset={insets.top}
      />

      <View style={styles.body}>
        {tab === 'overview' && (
          <OverviewTab
            state={state}
            verdict={seed.verdict}
            breakdown={seed.scoreBreakdown}
            score={score}
            color={color}
            onToast={toast.show}
            onRiskPress={openRisk}
            onOpenContact={() => setContactOpen(true)}
            onManageCollab={() => setCollabOpen(true)}
          />
        )}
        {tab === 'calc' && (
          <CalcTab state={state} actions={actions} onToast={toast.show} />
        )}
        {tab === 'docs' &&
          (docs ? (
            <DocsTab
              docs={docs}
              onRequestDoc={(missingId) => store.requestDocument(dealId, missingId)}
              onAddDocuments={(newDocs) => store.addDocuments(dealId, newDocs)}
              onAskDocument={askDocument}
              onToast={toast.show}
            />
          ) : (
            <StubTab
              title="Dokumente"
              note="Keine Dokumente für diesen Deal."
              variant="docs"
              testID="docs-stub"
            />
          ))}
        {tab === 'chat' &&
          (chats ? (
            <ChatTab
              chats={chats}
              docs={docs}
              actions={chatActions}
              onOpenRisk={openRisk}
              onSwitchTab={setTab}
              onToast={toast.show}
            />
          ) : (
            <StubTab
              title="Chat"
              note="Kein Chat für diesen Deal."
              variant="chat"
              testID="chat-stub"
            />
          ))}
      </View>

      <DealMenuSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={headerTitle}
        status={deal.dealStatus}
        onStatus={() => {
          setMenuOpen(false);
          setStatusOpen(true);
        }}
        onEdit={() => {
          setMenuOpen(false);
          setEditOpen(true);
        }}
        onCollab={() => {
          setMenuOpen(false);
          setCollabOpen(true);
        }}
        onShare={() => {
          setMenuOpen(false);
          toast.show('Deal teilen · digitales Exposé – Demo');
        }}
        onDelete={() => {
          setMenuOpen(false);
          setDeleteOpen(true);
        }}
      />

      <StatusSheet
        visible={statusOpen}
        onClose={() => setStatusOpen(false)}
        status={deal.dealStatus}
        onPick={(status) => {
          store.setDealStatus(dealId, status);
          setStatusOpen(false);
          toast.show(`Status: ${SECTION_LABEL[status]}`);
        }}
      />

      <ObjektdatenSheet
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        state={state}
        onSave={(patch) => {
          store.updateObjektdaten(dealId, patch);
          setEditOpen(false);
          toast.show('Objektdaten gespeichert');
        }}
      />

      <CollaborateSheet
        visible={collabOpen}
        onClose={() => setCollabOpen(false)}
        dealTitle={headerTitle}
        collaborators={state.collaborators}
        onInvite={(email, role) => store.addCollaborator(dealId, email, role)}
        onCopyLink={() => toast.show('Einladungslink kopiert')}
        onRemove={(collabId) => store.removeCollaborator(dealId, collabId)}
        onToast={toast.show}
      />

      <ContactSheet
        visible={contactOpen}
        onClose={() => setContactOpen(false)}
        contact={state.contact}
        onToast={toast.show}
      />

      <ConfirmDialog
        visible={deleteOpen}
        title="Deal löschen?"
        message={`„${headerTitle}" wird dauerhaft aus deiner Pipeline entfernt.`}
        confirmLabel="Löschen"
        destructive
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          setDeleteOpen(false);
          store.deleteDeal(dealId);
          toast.show('Deal gelöscht');
          router.back();
        }}
        testID="delete-confirm"
      />

      <Toast controller={toast} bottom={insets.bottom + 24} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgApp },
  body: { flex: 1 },
  missing: { ...type.body, textAlign: 'center', color: colors.muted },
});
